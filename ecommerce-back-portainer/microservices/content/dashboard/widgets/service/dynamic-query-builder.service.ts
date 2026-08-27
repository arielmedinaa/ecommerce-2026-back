import { Injectable } from '@nestjs/common';
import { EcontDatabaseService } from '@shared/config/database/econt.database.module';
import { CartDatabaseService } from '@shared/config/database/cart.database.module';
import { ENTITY_CATALOG, buscarEntidad, buscarCampo, EntidadCatalogo, TipoAgregacion } from '../const/entity-catalog';

const MAX_ENTIDADES = 5;
const MAX_FILAS = 200;

export interface RelacionInput {
  entidadA: string;
  campoA: string;
  entidadB: string;
  campoB: string;
}

export interface CampoSeleccionadoInput {
  entidad: string;
  campo: string;
  agregacion?: TipoAgregacion;
}

export interface FiltroDinamicoInput {
  entidad: string;
  campo: string;
  operador: 'igual' | 'entre' | 'contiene' | 'en_lista' | 'no_en_lista' | 'pertenece_a_promocion';
  valor: any;
}

export interface DynamicQueryConfig {
  entidades: string[];
  relaciones: RelacionInput[];
  campos: CampoSeleccionadoInput[];
  filtros: FiltroDinamicoInput[];
}

interface ResultadoQuery {
  data: { total: number; cantidad: number; filas: any[] };
  message: string;
  success: boolean;
}

/**
 * Resuelve consultas armadas visualmente por el admin en "Crear Análisis",
 * uniendo entidades del catálogo (`entity-catalog.ts`) de forma dinámica.
 * Toda identificación de tabla/columna sale EXCLUSIVAMENTE del catálogo —
 * nunca se interpola texto libre del admin en el SQL, solo valores vía `?`.
 */
@Injectable()
export class DynamicQueryBuilderService {
  constructor(
    private readonly econtDb: EcontDatabaseService,
    private readonly cartDb: CartDatabaseService,
  ) {}

  getCatalogoEntidades() {
    return { data: ENTITY_CATALOG, message: 'Catálogo de entidades obtenido', success: true };
  }

  async previewQuery(config: DynamicQueryConfig): Promise<ResultadoQuery> {
    const validacion = this.validar(config);
    if (!validacion.ok) {
      return { data: { total: 0, cantidad: 0, filas: [] }, message: validacion.mensaje, success: false };
    }

    try {
      const base = buscarEntidad(config.entidades[0]) as EntidadCatalogo;

      // "Carritos" vive en otra base de datos (`cart_db`) — no se puede
      // ejecutar en la misma conexión que el resto del catálogo (ERP). El
      // único puente soportado hoy es "pertenece a la promoción X": se
      // resuelve en el ERP (donde SÍ están relacionadas comprobante/numero/
      // id_promo con la tabla puente `cs_solicitud_ecommerce_cabecera`) y el
      // resultado (una lista de `carritos.codigo`) se inyecta como un filtro
      // "en_lista" normal antes de armar el SQL final contra `cart_db`.
      let filtros = config.filtros || [];
      if (base.origen === 'cart') {
        const filtroPromo = filtros.find((f) => f.operador === 'pertenece_a_promocion');
        if (filtroPromo) {
          const idPromo = Number(filtroPromo.valor);
          if (!Number.isFinite(idPromo)) {
            return { data: { total: 0, cantidad: 0, filas: [] }, message: 'El ID de promoción no es válido.', success: false };
          }
          const codigosCarrito = await this.econtDb.executeQuery<{ carrito_codigo: number }>(
            `SELECT DISTINCT csec.mongo_id AS carrito_codigo
             FROM solicitudcab sc
             JOIN solicituddet sd ON sd.comprobante = sc.comprobante AND sd.numero = sc.numero
             JOIN cs_solicitud_ecommerce_cabecera csec ON csec.solicitudcab_secuencia = sc.secuencia
             WHERE sd.id_promo = ?`,
            [idPromo],
          );
          if (codigosCarrito.length === 0) {
            return { data: { total: 0, cantidad: 0, filas: [] }, message: 'Consulta procesada correctamente', success: true };
          }
          filtros = filtros
            .filter((f) => f.operador !== 'pertenece_a_promocion')
            .concat({ entidad: base.key, campo: 'codigo', operador: 'en_lista', valor: codigosCarrito.map((c) => c.carrito_codigo) });
        }
      }

      const { sql, params, camposAgregados } = this.construirSql({ ...config, filtros });
      const executor = base.origen === 'cart' ? this.cartDb : this.econtDb;
      const filas = await executor.executeQuery<any>(sql, params);

      let total = 0;
      for (const campoAgg of camposAgregados) {
        for (const fila of filas) {
          const valor = Number(fila[campoAgg]);
          if (Number.isFinite(valor)) total += valor;
        }
      }

      return {
        data: { total, cantidad: filas.length, filas },
        message: 'Consulta procesada correctamente',
        success: true,
      };
    } catch (error) {
      return {
        data: { total: 0, cantidad: 0, filas: [] },
        message: error?.message || 'Error al procesar la consulta',
        success: false,
      };
    }
  }

  /** Valida que toda entidad/campo/relación referenciada exista en el catálogo. */
  private validar(config: DynamicQueryConfig): { ok: boolean; mensaje: string } {
    if (!Array.isArray(config.entidades) || config.entidades.length === 0) {
      return { ok: false, mensaje: 'Elegí al menos una card de datos.' };
    }
    if (config.entidades.length > MAX_ENTIDADES) {
      return { ok: false, mensaje: `No se pueden relacionar más de ${MAX_ENTIDADES} cards en una sola consulta.` };
    }

    const entidades = new Map<string, EntidadCatalogo>();
    for (const key of config.entidades) {
      const entidad = buscarEntidad(key);
      if (!entidad) return { ok: false, mensaje: `La card "${key}" no existe en el catálogo.` };
      entidades.set(key, entidad);
    }

    // "Carritos" vive en otra base de datos (cart_db) — no se puede unir por
    // JOIN con cards del ERP en esta versión. Solo se soporta como card
    // única, filtrada eventualmente por el puente "pertenece a la promoción".
    const origenes = new Set(Array.from(entidades.values()).map((e) => e.origen));
    if (origenes.size > 1) {
      return { ok: false, mensaje: 'Carritos no se puede combinar con cards del ERP todavía — usala sola en el análisis.' };
    }

    for (const rel of config.relaciones || []) {
      const entA = entidades.get(rel.entidadA);
      const entB = entidades.get(rel.entidadB);
      if (!entA || !entB) return { ok: false, mensaje: 'Una de las relaciones apunta a una card no seleccionada.' };
      if (!buscarCampo(entA, rel.campoA) || !buscarCampo(entB, rel.campoB)) {
        return { ok: false, mensaje: 'Uno de los datos usados para relacionar cards no existe.' };
      }
    }

    if (!Array.isArray(config.campos) || config.campos.length === 0) {
      return { ok: false, mensaje: 'Elegí al menos un dato para mostrar.' };
    }
    for (const campo of config.campos) {
      const entidad = entidades.get(campo.entidad);
      if (!entidad) return { ok: false, mensaje: `La card "${campo.entidad}" no fue seleccionada.` };
      const def = buscarCampo(entidad, campo.campo);
      if (!def) return { ok: false, mensaje: `El dato "${campo.campo}" no existe en "${entidad.nombre}".` };
      // "Contar", "Contar únicos" y "Combinar" tienen sentido sobre cualquier
      // campo (cuentan filas/valores distintos, o concatenan valores);
      // "sumar"/"promediar" solo si el campo fue marcado explícitamente
      // como numérico/agregable.
      if (
        campo.agregacion &&
        campo.agregacion !== 'conteo' &&
        campo.agregacion !== 'conteo_unico' &&
        campo.agregacion !== 'combinar' &&
        !def.agregable?.includes(campo.agregacion)
      ) {
        return { ok: false, mensaje: `El dato "${def.nombre}" no admite esa agregación.` };
      }
    }

    for (const filtro of config.filtros || []) {
      const entidad = entidades.get(filtro.entidad);
      if (!entidad) return { ok: false, mensaje: `La card "${filtro.entidad}" no fue seleccionada.` };
      if (!buscarCampo(entidad, filtro.campo)) {
        return { ok: false, mensaje: `El dato "${filtro.campo}" no existe en "${entidad.nombre}".` };
      }
      if (!['igual', 'entre', 'contiene', 'en_lista', 'no_en_lista', 'pertenece_a_promocion'].includes(filtro.operador)) {
        return { ok: false, mensaje: 'Operador de filtro no reconocido.' };
      }
      if (filtro.operador === 'pertenece_a_promocion' && entidad.origen !== 'cart') {
        return { ok: false, mensaje: 'El filtro "Pertenece a la promoción" solo aplica a la card Carritos.' };
      }
    }

    return { ok: true, mensaje: '' };
  }

  // Si el mismo campo se selecciona más de una vez con agregaciones distintas
  // (ej. "Contar" y "Contar únicos" sobre el mismo dato), el alias sin
  // sufijo colisionaría y una pisaría a la otra en el resultado — se agrega
  // la agregación al alias para que cada combinación sea única.
  private aliasCampo(entidadKey: string, campoKey: string, agregacion?: string) {
    return agregacion ? `${entidadKey}__${campoKey}_${agregacion}` : `${entidadKey}__${campoKey}`;
  }

  private construirSql(config: DynamicQueryConfig): { sql: string; params: any[]; camposAgregados: string[] } {
    const entidades = new Map<string, EntidadCatalogo>(config.entidades.map((k) => [k, buscarEntidad(k) as EntidadCatalogo]));
    const base = entidades.get(config.entidades[0]) as EntidadCatalogo;

    // Agrupa las relaciones por par de entidades ANTES de armar los JOIN: una
    // clave compuesta (ej. comprobante+numero) llega como 2+ RelacionInput
    // separadas entre las MISMAS dos entidades, y deben resolver en un solo
    // JOIN con varias condiciones unidas por AND — si se procesaran como
    // JOINs independientes, la segunda condición se perdería silenciosamente
    // (la pareja ya figuraría como "unida") y el JOIN quedaría abierto por
    // una sola columna de baja cardinalidad, multiplicando filas sin límite.
    const clavePar = (x: string, y: string) => [x, y].sort().join('::');
    const paresPorRelacion = new Map<string, { entidadA: string; entidadB: string; condiciones: { campoA: string; campoB: string }[] }>();
    for (const rel of config.relaciones || []) {
      const clave = clavePar(rel.entidadA, rel.entidadB);
      const existente = paresPorRelacion.get(clave);
      if (existente) {
        existente.condiciones.push({ campoA: rel.campoA, campoB: rel.campoB });
      } else {
        paresPorRelacion.set(clave, { entidadA: rel.entidadA, entidadB: rel.entidadB, condiciones: [{ campoA: rel.campoA, campoB: rel.campoB }] });
      }
    }

    const joins: string[] = [];
    const yaUnidas = new Set<string>([base.key]);
    const pendientes = Array.from(paresPorRelacion.values());
    let avance = true;
    while (avance && pendientes.length > 0) {
      avance = false;
      for (let i = pendientes.length - 1; i >= 0; i--) {
        const rel = pendientes[i];
        const aUnida = yaUnidas.has(rel.entidadA);
        const bUnida = yaUnidas.has(rel.entidadB);
        if (aUnida === bUnida) continue; // ambas ya unidas o ninguna: se resuelve en otra vuelta o se ignora

        const nuevaKey = aUnida ? rel.entidadB : rel.entidadA;
        const existenteKey = aUnida ? rel.entidadA : rel.entidadB;
        const nuevaEntidad = entidades.get(nuevaKey) as EntidadCatalogo;
        const existenteEntidad = entidades.get(existenteKey) as EntidadCatalogo;

        const onConditions = rel.condiciones.map((par) => {
          const campoNueva = buscarCampo(nuevaEntidad, aUnida ? par.campoB : par.campoA) as any;
          const campoExistente = buscarCampo(existenteEntidad, aUnida ? par.campoA : par.campoB) as any;
          return `${campoExistente.columna} = ${campoNueva.columna}`;
        });

        joins.push(`LEFT JOIN ${nuevaEntidad.tabla} ${nuevaEntidad.alias} ON ${onConditions.join(' AND ')}`);
        yaUnidas.add(nuevaKey);
        pendientes.splice(i, 1);
        avance = true;
      }
    }

    for (const key of config.entidades) {
      if (!yaUnidas.has(key)) {
        throw new Error(`No se pudo relacionar la card "${entidades.get(key)?.nombre}" con el resto — falta indicar por qué dato se une.`);
      }
    }

    const selectPartes: string[] = [];
    const groupByPartes: string[] = [];
    // `camposAgregados`: solo agregaciones NUMÉRICAS — son las que se suman
    // en JS para calcular `total`. `combinar` (GROUP_CONCAT, texto) dispara
    // GROUP BY igual que cualquier agregación, pero no debe sumarse como
    // total — por eso se trackea aparte en `camposConAgregacion`.
    const camposAgregados: string[] = [];
    const camposConAgregacion: string[] = [];

    for (const campo of config.campos) {
      const entidad = entidades.get(campo.entidad) as EntidadCatalogo;
      const def = buscarCampo(entidad, campo.campo) as any;
      const alias = this.aliasCampo(campo.entidad, campo.campo, campo.agregacion);
      if (campo.agregacion === 'suma') {
        selectPartes.push(`COALESCE(SUM(${def.columna}), 0) AS ${alias}`);
        camposAgregados.push(alias);
        camposConAgregacion.push(alias);
      } else if (campo.agregacion === 'conteo') {
        selectPartes.push(`COUNT(${def.columna}) AS ${alias}`);
        camposAgregados.push(alias);
        camposConAgregacion.push(alias);
      } else if (campo.agregacion === 'conteo_unico') {
        // COUNT(DISTINCT ...) — necesario cuando el JOIN con una entidad
        // "detalle" (N filas por cabecera) infla un COUNT normal.
        selectPartes.push(`COUNT(DISTINCT ${def.columna}) AS ${alias}`);
        camposAgregados.push(alias);
        camposConAgregacion.push(alias);
      } else if (campo.agregacion === 'promedio') {
        selectPartes.push(`AVG(${def.columna}) AS ${alias}`);
        camposAgregados.push(alias);
        camposConAgregacion.push(alias);
      } else if (campo.agregacion === 'combinar') {
        // GROUP_CONCAT(DISTINCT ...) — combina en una sola celda los valores
        // repetidos que aparecen por el join con una entidad "detalle"
        // (ej. varios productos de un mismo pedido), permitiendo que la
        // cabecera quede en una única fila en vez de una por línea.
        selectPartes.push(`GROUP_CONCAT(DISTINCT ${def.columna} SEPARATOR ', ') AS ${alias}`);
        camposConAgregacion.push(alias);
      } else {
        selectPartes.push(`${def.columna} AS ${alias}`);
        groupByPartes.push(def.columna);
      }
    }

    const hayAgregaciones = camposConAgregacion.length > 0;

    const condiciones: string[] = [];
    const params: any[] = [];
    for (const filtro of config.filtros || []) {
      const entidad = entidades.get(filtro.entidad) as EntidadCatalogo;
      const def = buscarCampo(entidad, filtro.campo) as any;
      if (filtro.operador === 'igual' && filtro.valor !== undefined && filtro.valor !== null && filtro.valor !== '') {
        condiciones.push(`${def.columna} = ?`);
        params.push(filtro.valor);
      } else if (filtro.operador === 'entre' && filtro.valor?.desde && filtro.valor?.hasta) {
        condiciones.push(`${def.columna} >= ? AND ${def.columna} <= ?`);
        params.push(filtro.valor.desde, filtro.valor.hasta);
      } else if (filtro.operador === 'contiene' && filtro.valor) {
        condiciones.push(`${def.columna} LIKE ?`);
        params.push(`%${filtro.valor}%`);
      } else if (filtro.operador === 'en_lista' || filtro.operador === 'no_en_lista') {
        const valores = Array.isArray(filtro.valor)
          ? filtro.valor
          : String(filtro.valor || '')
              .split(',')
              .map((v) => v.trim())
              .filter((v) => v !== '');
        if (valores.length > 0) {
          const placeholders = valores.map(() => '?').join(', ');
          condiciones.push(`${def.columna} ${filtro.operador === 'no_en_lista' ? 'NOT IN' : 'IN'} (${placeholders})`);
          params.push(...valores);
        }
      }
    }

    const fromClause = `${base.tabla} ${base.alias} ${joins.join(' ')}`;
    const whereClause = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
    const groupByClause = hayAgregaciones && groupByPartes.length > 0 ? `GROUP BY ${groupByPartes.join(', ')}` : '';

    const sql = `
      SELECT ${selectPartes.join(', ')}
      FROM ${fromClause}
      ${whereClause}
      ${groupByClause}
      LIMIT ${MAX_FILAS}
    `;

    return { sql, params, camposAgregados };
  }
}
