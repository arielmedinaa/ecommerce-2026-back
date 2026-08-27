import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { EcontDatabaseService } from '@shared/config/database/econt.database.module';
import { CARD_CATALOG } from '../const/card-catalog';
import { DynamicQueryBuilderService, DynamicQueryConfig } from './dynamic-query-builder.service';

interface FiltroInput {
  tipo: string;
  desde?: string;
  hasta?: string;
  clienteCodigo?: number | string;
  idPromo?: number | string;
  estadoSoli?: number | string;
}

interface WidgetConfigInput {
  // Config "clásica" (métrica fija + filtros predefinidos) — se mantiene
  // para no romper widgets ya guardados.
  metrica?: string;
  // Config del constructor dinámico ("Crear Análisis" libre) — ver
  // DynamicQueryBuilderService. Cuando `entidades` está presente, `filtros`
  // usa la forma de `FiltroDinamicoInput`, no la clásica.
  entidades?: string[];
  relaciones?: DynamicQueryConfig['relaciones'];
  campos?: DynamicQueryConfig['campos'];
  filtros?: any[];
}

const METRICA_SQL: Record<
  string,
  {
    tabla: string;
    alias: string;
    sumExpr: string;
    baseWhere: string;
    dateColumn: string;
    detailSelect: string;
    detailJoins: string;
  }
> = {
  venta: {
    tabla: 'ventacab',
    alias: 'vc',
    sumExpr: '(vc.exenta + vc.gravada5 + vc.gravada10)',
    baseWhere: "FIND_IN_SET(vc.comprobante,'83,111,114,117,122,84,113,116,119')",
    dateColumn: 'vc.fecha',
    detailSelect: 'vc.comprobante, vc.numero, vc.fecha, (vc.exenta + vc.gravada5 + vc.gravada10) AS monto',
    detailJoins: '',
  },
  a_facturar: {
    tabla: 'solicitudcab',
    alias: 's',
    sumExpr: 's.gravada10',
    baseWhere: 's.estado_soli = 16',
    dateColumn: 's.age_frecepcion',
    detailSelect:
      's.secuencia, s.comprobante, s.numero, s.estado_soli, tes.estado, s.cliente, cl.nombre AS cliente_nombre, s.fecha, s.age_frecepcion, s.gravada10',
    detailJoins:
      'LEFT JOIN cliente cl ON cl.codigo = s.cliente LEFT JOIN tbl_estados_solicitud tes ON tes.codigo_estado_solicitud = s.estado_soli',
  },
  facturado_ecommerce: {
    tabla: 'solicitudcab',
    alias: 's',
    sumExpr: 's.gravada10',
    baseWhere:
      "s.comprobante IN (2260, 2560) AND s.estado_soli IN (16, 19) AND s.estado_soli NOT IN (31, 25, 37)",
    dateColumn: 's.fecha',
    detailSelect:
      's.secuencia, s.comprobante, s.numero, s.estado_soli, tes.estado, s.cliente, cl.nombre AS cliente_nombre, s.fecha, s.age_frecepcion, s.gravada10',
    detailJoins:
      'LEFT JOIN cliente cl ON cl.codigo = s.cliente LEFT JOIN tbl_estados_solicitud tes ON tes.codigo_estado_solicitud = s.estado_soli',
  },
};

@Injectable()
export class WidgetQueryService {
  constructor(
    private readonly econtDb: EcontDatabaseService,
    @Inject('CART_SERVICE') private readonly cartClient: ClientProxy,
    private readonly dynamicQueryBuilder: DynamicQueryBuilderService,
  ) {}

  getCatalogo() {
    return { data: CARD_CATALOG, message: 'Catálogo obtenido', success: true };
  }

  getEntityCatalog() {
    return this.dynamicQueryBuilder.getCatalogoEntidades();
  }

  private rangoMesActual() {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return {
      desde: inicioMes.toISOString().slice(0, 10),
      hasta: ahora.toISOString().slice(0, 10),
    };
  }

  private async previewNatsQuery(config: WidgetConfigInput): Promise<{
    data: { total: number; cantidad: number; filas: any[] };
    message: string;
    success: boolean;
  }> {
    try {
      const filtroFecha = (config.filtros || []).find((f) => f.tipo === 'fecha');
      const { desde, hasta } = this.rangoMesActual();
      const rangoDesde = filtroFecha?.desde || desde;
      const rangoHasta = filtroFecha?.hasta || hasta;

      if (config.metrica === 'carritos_abandonados') {
        const resultado = await firstValueFrom(
          this.cartClient.send({ cmd: 'count_carritos_abandonados' }, { desde: rangoDesde, hasta: rangoHasta }),
        );
        return {
          data: { total: resultado?.data?.total || 0, cantidad: resultado?.data?.total || 0, filas: [] },
          message: 'Consulta procesada correctamente',
          success: !!resultado?.success,
        };
      }

      if (config.metrica === 'productos_top_vendidos') {
        const resultado = await firstValueFrom(
          this.cartClient.send({ cmd: 'get_top_productos_vendidos' }, { desde: rangoDesde, hasta: rangoHasta, limit: 50 }),
        );
        return {
          data: {
            total: resultado?.data?.total || 0,
            cantidad: resultado?.data?.cantidad || 0,
            filas: resultado?.data?.filas || [],
          },
          message: 'Consulta procesada correctamente',
          success: !!resultado?.success,
        };
      }

      return { data: { total: 0, cantidad: 0, filas: [] }, message: 'Métrica no reconocida', success: false };
    } catch (error) {
      return { data: { total: 0, cantidad: 0, filas: [] }, message: error?.message || 'Error al procesar la consulta', success: false };
    }
  }

  private construirFiltros(metrica: string, filtros: FiltroInput[]) {
    const meta = METRICA_SQL[metrica];
    const condiciones: string[] = [meta.baseWhere];
    const params: any[] = [];
    const alias = meta.alias;

    for (const filtro of filtros || []) {
      if (filtro.tipo === 'fecha' && filtro.desde && filtro.hasta) {
        condiciones.push(`${meta.dateColumn} >= ? AND ${meta.dateColumn} < DATE_ADD(?, INTERVAL 1 DAY)`);
        params.push(filtro.desde, filtro.hasta);
      }
      if (filtro.tipo === 'cliente' && filtro.clienteCodigo) {
        condiciones.push(`${alias}.cliente = ?`);
        params.push(filtro.clienteCodigo);
      }
      if (filtro.tipo === 'promocion' && filtro.idPromo) {
        condiciones.push(
          `EXISTS (SELECT 1 FROM solicituddet sd WHERE sd.comprobante = ${alias}.comprobante AND sd.numero = ${alias}.numero AND sd.id_promo = ?)`,
        );
        params.push(filtro.idPromo);
      }
      if (filtro.tipo === 'estado' && filtro.estadoSoli !== undefined && filtro.estadoSoli !== null) {
        condiciones.push(`${alias}.estado_soli = ?`);
        params.push(filtro.estadoSoli);
      }
    }

    return { condiciones, params };
  }

  async previewQuery(config: WidgetConfigInput): Promise<{
    data: { total: number; cantidad: number; filas: any[] };
    message: string;
    success: boolean;
  }> {
    if (Array.isArray(config.entidades) && config.entidades.length > 0) {
      return this.dynamicQueryBuilder.previewQuery(config as unknown as DynamicQueryConfig);
    }

    if (config.metrica === 'carritos_abandonados' || config.metrica === 'productos_top_vendidos') {
      return this.previewNatsQuery(config);
    }

    if (!config.metrica) {
      return { data: { total: 0, cantidad: 0, filas: [] }, message: 'Métrica no reconocida', success: false };
    }

    try {
      const meta = METRICA_SQL[config.metrica];
      if (!meta) {
        return {
          data: { total: 0, cantidad: 0, filas: [] },
          message: 'Métrica no reconocida',
          success: false,
        };
      }

      const { condiciones, params } = this.construirFiltros(config.metrica, config.filtros || []);
      const whereClause = condiciones.join(' AND ');

      const resumenSql = `
        SELECT COALESCE(SUM(${meta.sumExpr}), 0) AS total, COUNT(*) AS cantidad
        FROM ${meta.tabla} ${meta.alias}
        WHERE ${whereClause}
      `;

      const detalleSql = `
        SELECT ${meta.detailSelect}
        FROM ${meta.tabla} ${meta.alias}
        ${meta.detailJoins}
        WHERE ${whereClause}
        ORDER BY ${meta.dateColumn} DESC
        LIMIT 50
      `;

      const [resumenRows, detalleRows] = await Promise.all([
        this.econtDb.executeQuery<{ total: string; cantidad: string }>(resumenSql, params),
        this.econtDb.executeQuery<any>(detalleSql, params),
      ]);

      return {
        data: {
          total: Number(resumenRows[0]?.total || 0),
          cantidad: Number(resumenRows[0]?.cantidad || 0),
          filas: detalleRows,
        },
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

  async executeStoredConfig(configJson: string): Promise<{
    data: { total: number; cantidad: number; filas: any[] };
    message: string;
    success: boolean;
  }> {
    const config = JSON.parse(configJson) as WidgetConfigInput;
    return this.previewQuery(config);
  }
}
