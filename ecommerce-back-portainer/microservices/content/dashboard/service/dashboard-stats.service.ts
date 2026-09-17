import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import moment = require('moment-timezone');
import { EcontDatabaseService } from '@shared/config/database/econt.database.module';
import { MetaVentas } from '../schemas/meta-ventas.schema';
import { IngresoExterno } from '../schemas/ingreso-externo.schema';
import { HistorialDashboard } from '../schemas/historial-dashboard.schema';
import { Between } from 'typeorm';

const COORDINADOR_ECOMMERCE = 52;

const VENDEDORES_ECOMMERCE_SUBQUERY = `(SELECT vd.codigo FROM vendedor vd WHERE vd.coordinador = ${COORDINADOR_ECOMMERCE})`;

const FACTURACION_QUERY = `
  SELECT COALESCE(SUM(sc.gravada10), 0) AS total
  FROM solicitudcab sc
  WHERE EXISTS (
      SELECT 1 FROM solicituddet sd
      WHERE sd.comprobante = sc.comprobante AND sd.numero = sc.numero
    )
    AND sc.age_frecepcion BETWEEN ? AND ?
    AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
    AND sc.estado_soli NOT IN ('31', '25', '37')
    AND sc.estado_soli IN ('19', '16')
`;

const FACTURACION_EN_VIVO_QUERY = `
  SELECT COALESCE(SUM(sc.gravada10), 0) AS total
  FROM solicitudcab sc
  WHERE EXISTS (
      SELECT 1 FROM solicituddet sd
      WHERE sd.comprobante = sc.comprobante AND sd.numero = sc.numero
    )
    AND sc.age_frecepcion BETWEEN ? AND ?
    AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
    AND sc.estado_soli = '19'
`;

const FACTURACION_EN_VIVO_PUNTOS_DIA_QUERY = `
  SELECT sc.gravada10, sc.a_horaini
  FROM solicitudcab sc
  WHERE EXISTS (
      SELECT 1 FROM solicituddet sd
      WHERE sd.comprobante = sc.comprobante AND sd.numero = sc.numero
    )
    AND sc.age_frecepcion = ?
    AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
    AND sc.estado_soli = '19'
  ORDER BY sc.a_horaini ASC
`;

function buildFacturacionContadoCreditoQuery(columnaFecha: string): string {
  return `
    SELECT
      COALESCE(SUM(CASE WHEN sc.cuota = 1 THEN sc.gravada10 ELSE 0 END), 0) AS total_contado,
      COALESCE(SUM(CASE WHEN sc.cuota = 2 THEN sc.gravada10 ELSE 0 END), 0) AS total_credito,
      COALESCE(SUM(sc.gravada10), 0) AS total,
      COUNT(CASE WHEN sc.cuota = 1 THEN 1 END) AS cantidad_contado,
      COUNT(CASE WHEN sc.cuota = 2 THEN 1 END) AS cantidad_credito,
      COUNT(*) AS cantidad
    FROM solicitudcab sc
    WHERE EXISTS (
        SELECT 1 FROM solicituddet sd
        WHERE sd.comprobante = sc.comprobante AND sd.numero = sc.numero
      )
      AND ${columnaFecha} BETWEEN ? AND ?
      AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
      AND sc.estado_soli NOT IN ('31', '25', '37')
      AND sc.estado_soli IN ('19', '16')
  `;
}

function buildHistorialPromocionesQuery(columnaFecha: string): string {
  return `
    SELECT
      COALESCE(sd.id_promo, 0) AS id_promo,
      COALESCE(pc.nombre, 'Productos individuales') AS nombre_promo,
      COALESCE(SUM(sd.gravada10), 0) AS monto,
      COUNT(*) AS cantidad_lineas,
      COUNT(DISTINCT CONCAT(sc.comprobante, '-', sc.numero)) AS cantidad_documentos
    FROM solicitudcab sc
    INNER JOIN solicituddet sd ON sd.comprobante = sc.comprobante AND sd.numero = sc.numero
    LEFT JOIN tbl_promos_cabeceras pc ON pc.id_promo = sd.id_promo
    WHERE ${columnaFecha} BETWEEN ? AND ?
      AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
      AND sc.estado_soli NOT IN ('31', '25', '37')
      AND sc.estado_soli IN ('19', '16')
    GROUP BY COALESCE(sd.id_promo, 0), nombre_promo
    ORDER BY monto DESC
  `;
}

function buildHistorialTopProductosQuery(columnaFecha: string): string {
  return `
    SELECT
      sd.codigo AS codigo,
      sd.descrip AS descripcion,
      COALESCE(SUM(sd.gravada10), 0) AS monto,
      SUM(sd.cantidad) AS cantidad_unidades,
      COUNT(*) AS cantidad_lineas
    FROM solicitudcab sc
    INNER JOIN solicituddet sd ON sd.comprobante = sc.comprobante AND sd.numero = sc.numero
    WHERE ${columnaFecha} BETWEEN ? AND ?
      AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
      AND sc.estado_soli NOT IN ('31', '25', '37')
      AND sc.estado_soli IN ('19', '16')
    GROUP BY sd.codigo, sd.descrip
    ORDER BY monto DESC
    LIMIT 5
  `;
}

const TOTAL_FACTURADO_EMPRESA_QUERY = `
  SELECT COALESCE(SUM(vc.exenta + vc.gravada5 + vc.gravada10), 0) AS total
  FROM ventacab vc
  WHERE vc.fecha BETWEEN ? AND ?
    AND FIND_IN_SET(vc.comprobante, '83,111,114,117,122,84,113,116,119') > 0
`;

const A_FACTURAR_TOTAL_EMPRESA_QUERY = `
  SELECT COALESCE(SUM(s.gravada10), 0) AS total, COUNT(*) AS cantidad
  FROM solicitudcab s
  WHERE s.estado_soli = 16
    AND s.age_frecepcion < DATE_ADD(?, INTERVAL 1 DAY)
`;

const A_FACTURAR_ECOMMERCE_QUERY = `
  SELECT COALESCE(SUM(s.gravada10), 0) AS total, COUNT(*) AS cantidad
  FROM solicitudcab s
  WHERE s.estado_soli = 16
    AND s.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
    AND s.age_frecepcion < DATE_ADD(?, INTERVAL 1 DAY)
`;

const A_FACTURAR_ECOMMERCE_DETALLE_QUERY = `
  SELECT sc.secuencia, sc.comprobante, sc.numero, sc.estado_soli, tes.estado,
         sc.cliente, cl.nombre AS cliente_nombre, sc.fecha, sc.age_frecepcion, sc.gravada10
  FROM solicitudcab sc
  LEFT JOIN cliente cl ON cl.codigo = sc.cliente
  LEFT JOIN tbl_estados_solicitud tes ON tes.codigo_estado_solicitud = sc.estado_soli
  WHERE sc.estado_soli = 16
    AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
    AND sc.age_frecepcion >= ?
    AND sc.age_frecepcion < DATE_ADD(?, INTERVAL 1 DAY)
  ORDER BY sc.age_frecepcion DESC, sc.secuencia DESC
`;

const A_FACTURAR_CONTADO_CREDITO_QUERY = `
  SELECT
    COALESCE(SUM(CASE WHEN sc.cuota = 1 THEN sc.gravada10 ELSE 0 END), 0) AS total_contado,
    COALESCE(SUM(CASE WHEN sc.cuota = 2 THEN sc.gravada10 ELSE 0 END), 0) AS total_credito,
    COALESCE(SUM(sc.gravada10), 0) AS total,
    COUNT(CASE WHEN sc.cuota = 1 THEN 1 END) AS cantidad_contado,
    COUNT(CASE WHEN sc.cuota = 2 THEN 1 END) AS cantidad_credito,
    COUNT(*) AS cantidad
  FROM solicitudcab sc
  WHERE sc.estado_soli = 16
    AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
    AND sc.age_frecepcion >= ?
    AND sc.age_frecepcion < DATE_ADD(?, INTERVAL 1 DAY)
`;

const FACTURACION_HASTA_HORA_QUERY = `
  SELECT COALESCE(SUM(sc.gravada10), 0) AS total
  FROM solicitudcab sc
  WHERE EXISTS (
      SELECT 1 FROM solicituddet sd
      WHERE sd.comprobante = sc.comprobante AND sd.numero = sc.numero
    )
    AND sc.age_frecepcion = ?
    AND sc.a_horaini <= ?
    AND sc.comprobante IN ${VENDEDORES_ECOMMERCE_SUBQUERY}
    AND sc.estado_soli NOT IN ('31', '25', '37')
    AND sc.estado_soli IN ('19', '16')
`;

const TOTAL_FACTURADO_EMPRESA_HASTA_HORA_QUERY = `
  SELECT COALESCE(SUM(vc.exenta + vc.gravada5 + vc.gravada10), 0) AS total
  FROM ventacab vc
  WHERE vc.fecha = ?
    AND vc.created_at <= ?
    AND FIND_IN_SET(vc.comprobante, '83,111,114,117,122,84,113,116,119') > 0
`;

const META_PORCENTAJE_ECOMMERCE = 3;

@Injectable()
export class DashboardStatsService {
  private readonly logger = new Logger(DashboardStatsService.name);

  constructor(
    private readonly econtDb: EcontDatabaseService,
    @InjectRepository(MetaVentas, 'WRITE_CONNECTION')
    private readonly metaVentasRepository: Repository<MetaVentas>,
    @InjectRepository(IngresoExterno, 'WRITE_CONNECTION')
    private readonly ingresoExternoRepository: Repository<IngresoExterno>,
    @InjectRepository(HistorialDashboard, 'WRITE_CONNECTION')
    private readonly historialRepository: Repository<HistorialDashboard>,
  ) {}

  private async sumFacturacion(desde: Date, hasta: Date): Promise<number> {
    const rows = await this.econtDb.executeQuery<{ total: number }>(FACTURACION_QUERY, [
      desde.toISOString().slice(0, 10),
      hasta.toISOString().slice(0, 10),
    ]);
    return Number(rows?.[0]?.total || 0);
  }

  private async sumFacturacionTotalEmpresa(desde: Date, hasta: Date): Promise<number> {
    const rows = await this.econtDb.executeQuery<{ total: number }>(
      TOTAL_FACTURADO_EMPRESA_QUERY,
      [desde.toISOString().slice(0, 10), hasta.toISOString().slice(0, 10)],
    );
    return Number(rows?.[0]?.total || 0);
  }

  private async sumFacturacionHastaHora(fecha: Date, horaLimite: Date): Promise<number> {
    const rows = await this.econtDb.executeQuery<{ total: number }>(FACTURACION_HASTA_HORA_QUERY, [
      fecha.toISOString().slice(0, 10),
      moment(horaLimite).format('YYYY-MM-DD HH:mm:ss'),
    ]);
    return Number(rows?.[0]?.total || 0);
  }

  private async sumFacturacionTotalEmpresaHastaHora(
    fecha: Date,
    horaLimite: Date,
  ): Promise<number> {
    const rows = await this.econtDb.executeQuery<{ total: number }>(
      TOTAL_FACTURADO_EMPRESA_HASTA_HORA_QUERY,
      [fecha.toISOString().slice(0, 10), moment(horaLimite).format('YYYY-MM-DD HH:mm:ss')],
    );
    return Number(rows?.[0]?.total || 0);
  }

  private async sumFacturacionEnVivo(desde: Date, hasta: Date): Promise<number> {
    const rows = await this.econtDb.executeQuery<{ total: number }>(FACTURACION_EN_VIVO_QUERY, [
      desde.toISOString().slice(0, 10),
      hasta.toISOString().slice(0, 10),
    ]);
    return Number(rows?.[0]?.total || 0);
  }

  private async obtenerPuntosDelDiaEnVivo(
    fecha: Date,
  ): Promise<{ hora: string; monto: number }[]> {
    const rows = await this.econtDb.executeQuery<{ gravada10: number; a_horaini: string }>(
      FACTURACION_EN_VIVO_PUNTOS_DIA_QUERY,
      [fecha.toISOString().slice(0, 10)],
    );
    let acumulado = 0;
    return (rows || []).map((row) => {
      acumulado += Number(row.gravada10 || 0);
      return { hora: row.a_horaini, monto: acumulado };
    });
  }

  async getMetaMensual(): Promise<MetaVentas> {
    let meta = await this.metaVentasRepository.findOne({ where: { id: 1 } });
    if (!meta) {
      meta = await this.metaVentasRepository.save(
        this.metaVentasRepository.create({ id: 1, monto_meta: 0 }),
      );
    }
    return meta;
  }

  async setMetaMensual(
    monto: number,
    actualizadoPor: string,
  ): Promise<{ data: MetaVentas; message: string; success: boolean }> {
    await this.getMetaMensual(); // asegura que exista la fila id=1
    await this.metaVentasRepository.update(1, { monto_meta: monto, updated_by: actualizadoPor });
    const meta = await this.getMetaMensual();
    return { data: meta, message: 'Meta actualizada', success: true };
  }

  async listIngresosExternosMes(): Promise<IngresoExterno[]> {
    const ahora = new Date();
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    return this.ingresoExternoRepository.find({
      where: {
        fecha: Between(
          inicioMes.toISOString().slice(0, 10),
          ahora.toISOString().slice(0, 10),
        ),
      },
      order: { fecha: 'DESC', created_at: 'DESC' },
    });
  }

  async createIngresoExterno(dto: {
    monto: number;
    concepto: string;
    fecha: string;
    creadoPor: string;
  }): Promise<{ data: IngresoExterno; message: string; success: boolean }> {
    const ingreso = await this.ingresoExternoRepository.save(
      this.ingresoExternoRepository.create({
        monto: dto.monto,
        concepto: dto.concepto,
        fecha: dto.fecha,
        created_by: dto.creadoPor,
      }),
    );
    return { data: ingreso, message: 'Ingreso registrado', success: true };
  }

  async deleteIngresoExterno(
    id: number,
  ): Promise<{ data: null; message: string; success: boolean }> {
    await this.ingresoExternoRepository.delete(id);
    return { data: null, message: 'Ingreso eliminado', success: true };
  }

  private async sumIngresosExternos(desde: Date, hasta: Date): Promise<number> {
    const rows = await this.ingresoExternoRepository
      .createQueryBuilder('ie')
      .select('COALESCE(SUM(ie.monto), 0)', 'total')
      .where('ie.fecha BETWEEN :desde AND :hasta', {
        desde: desde.toISOString().slice(0, 10),
        hasta: hasta.toISOString().slice(0, 10),
      })
      .getRawOne<{ total: string }>();
    return Number(rows?.total || 0);
  }

  async getFacturacionMensual(): Promise<{
    data: {
      facturadoMes: number;
      facturadoErp: number;
      ingresosExternosMes: number;
      metaMensual: number;
      porcentaje: number;
      faltante: number;
      crecimientoSemanalMonto: number;
      crecimientoSemanalPorcentaje: number;
      ingresosExternos: IngresoExterno[];
    };
    message: string;
    success: boolean;
  }> {
    try {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 0, 0, 0);

      const finSemanaActual = ahora;
      const inicioSemanaActual = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);
      const finSemanaAnterior = inicioSemanaActual;
      const inicioSemanaAnterior = new Date(inicioSemanaActual.getTime() - 7 * 24 * 60 * 60 * 1000);

      const [
        facturadoErp,
        ventasSemanaActual,
        ventasSemanaAnterior,
        meta,
        ingresosExternosMes,
        ingresosExternos,
      ] = await Promise.all([
        this.sumFacturacion(inicioMes, finMes),
        this.sumFacturacion(inicioSemanaActual, finSemanaActual),
        this.sumFacturacion(inicioSemanaAnterior, finSemanaAnterior),
        this.getMetaMensual(),
        this.sumIngresosExternos(inicioMes, ahora),
        this.listIngresosExternosMes(),
      ]);

      const facturadoMes = facturadoErp + ingresosExternosMes;
      const metaMensual = Number(meta.monto_meta || 0);
      const porcentaje = metaMensual > 0 ? Math.min((facturadoMes / metaMensual) * 100, 100) : 0;
      const faltante = Math.max(metaMensual - facturadoMes, 0);
      const crecimientoSemanalMonto = ventasSemanaActual - ventasSemanaAnterior;
      const crecimientoSemanalPorcentaje =
        ventasSemanaAnterior > 0 ? (crecimientoSemanalMonto / ventasSemanaAnterior) * 100 : 0;

      return {
        data: {
          facturadoMes,
          facturadoErp,
          ingresosExternosMes,
          metaMensual,
          porcentaje,
          faltante,
          crecimientoSemanalMonto,
          crecimientoSemanalPorcentaje,
          ingresosExternos,
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error calculando facturación mensual: ${error.message}`);
      return {
        data: {
          facturadoMes: 0,
          facturadoErp: 0,
          ingresosExternosMes: 0,
          metaMensual: 0,
          porcentaje: 0,
          faltante: 0,
          crecimientoSemanalMonto: 0,
          crecimientoSemanalPorcentaje: 0,
          ingresosExternos: [],
        },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  async getPorcentajeEcommerceDiario(): Promise<{
    data: {
      desde: string;
      hasta: string;
      facturadoEcommerceMes: number;
      facturadoTotalEmpresaMes: number;
      porcentaje: number;
      metaPorcentaje: number;
      cumpleMeta: boolean;
    };
    message: string;
    success: boolean;
  }> {
    try {
      // Mes a la fecha (igual criterio que getFacturacionMensual): desde el
      // día 1 del mes actual hasta hoy, no solo "hoy" — un solo día da falsos
      // negativos porque los pedidos de ecommerce tardan en llegar al estado
      // "19" (aprobado/impreso) dentro del flujo del ERP.
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
      const desde = inicioMes.toISOString().slice(0, 10);
      const hasta = ahora.toISOString().slice(0, 10);

      const [facturadoEcommerceMes, facturadoTotalEmpresaMes] = await Promise.all([
        this.sumFacturacion(inicioMes, ahora),
        this.sumFacturacionTotalEmpresa(inicioMes, ahora),
      ]);

      const porcentaje =
        facturadoTotalEmpresaMes > 0
          ? (facturadoEcommerceMes / facturadoTotalEmpresaMes) * 100
          : 0;
      const cumpleMeta = porcentaje >= META_PORCENTAJE_ECOMMERCE;

      return {
        data: {
          desde,
          hasta,
          facturadoEcommerceMes,
          facturadoTotalEmpresaMes,
          porcentaje,
          metaPorcentaje: META_PORCENTAJE_ECOMMERCE,
          cumpleMeta,
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error calculando porcentaje ecommerce mes a la fecha: ${error.message}`);
      const hoy = new Date().toISOString().slice(0, 10);
      return {
        data: {
          desde: hoy,
          hasta: hoy,
          facturadoEcommerceMes: 0,
          facturadoTotalEmpresaMes: 0,
          porcentaje: 0,
          metaPorcentaje: META_PORCENTAJE_ECOMMERCE,
          cumpleMeta: false,
        },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  async getHistorialDesglosePromociones(
    desde: string,
    hasta: string,
    modoFecha: 'agendamiento' | 'solicitud' = 'agendamiento',
  ): Promise<{
    data: {
      total: number;
      promociones: {
        idPromo: number;
        nombre: string;
        monto: number;
        porcentaje: number;
        cantidadLineas: number;
        cantidadDocumentos: number;
      }[];
      topProductos: {
        codigo: string;
        descripcion: string;
        monto: number;
        porcentaje: number;
        cantidadUnidades: number;
        cantidadLineas: number;
      }[];
    };
    message: string;
    success: boolean;
  }> {
    try {
      const columnaFecha = modoFecha === 'solicitud' ? 'sc.fecha' : 'sc.age_frecepcion';

      const [promoRows, productoRows] = await Promise.all([
        this.econtDb.executeQuery<{
          id_promo: number;
          nombre_promo: string;
          monto: string;
          cantidad_lineas: string;
          cantidad_documentos: string;
        }>(buildHistorialPromocionesQuery(columnaFecha), [desde, hasta]),
        this.econtDb.executeQuery<{
          codigo: string;
          descripcion: string;
          monto: string;
          cantidad_unidades: string;
          cantidad_lineas: string;
        }>(buildHistorialTopProductosQuery(columnaFecha), [desde, hasta]),
      ]);

      const total = (promoRows || []).reduce((sum, r) => sum + Number(r.monto || 0), 0);

      const promociones = (promoRows || [])
        .map((r) => {
          const monto = Number(r.monto || 0);
          return {
            idPromo: Number(r.id_promo || 0),
            nombre: r.nombre_promo,
            monto,
            porcentaje: total > 0 ? (monto / total) * 100 : 0,
            cantidadLineas: Number(r.cantidad_lineas || 0),
            cantidadDocumentos: Number(r.cantidad_documentos || 0),
          };
        })
        .sort((a, b) => b.monto - a.monto);

      const topProductos = (productoRows || []).map((r) => {
        const monto = Number(r.monto || 0);
        return {
          codigo: r.codigo,
          descripcion: r.descripcion,
          monto,
          porcentaje: total > 0 ? (monto / total) * 100 : 0,
          cantidadUnidades: Number(r.cantidad_unidades || 0),
          cantidadLineas: Number(r.cantidad_lineas || 0),
        };
      });

      return {
        data: { total, promociones, topProductos },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error calculando desglose de promociones del historial: ${error.message}`);
      return {
        data: { total: 0, promociones: [], topProductos: [] },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  async getFacturacionEnVivo(): Promise<{
    data: {
      facturadoMes: number;
      facturadoTotalEmpresaMes: number;
      porcentaje: number;
      facturadoHoy: number;
      facturadoTotalEmpresaHoy: number;
      porcentajeHoy: number;
      metaPorcentaje: number;
      cumpleMeta: boolean;
      puntosDelDia: { hora: string; monto: number }[];
    };
    message: string;
    success: boolean;
  }> {
    try {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0);
      const finMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0, 0, 0, 0);

      const [
        facturadoMes,
        facturadoTotalEmpresaMes,
        facturadoHoy,
        facturadoTotalEmpresaHoy,
        puntosDelDia,
      ] = await Promise.all([
        this.sumFacturacionEnVivo(inicioMes, finMes),
        this.sumFacturacionTotalEmpresa(inicioMes, finMes),
        this.sumFacturacionEnVivo(ahora, ahora),
        this.sumFacturacionTotalEmpresa(ahora, ahora),
        this.obtenerPuntosDelDiaEnVivo(ahora),
      ]);

      const porcentaje =
        facturadoTotalEmpresaMes > 0 ? (facturadoMes / facturadoTotalEmpresaMes) * 100 : 0;
      const porcentajeHoy =
        facturadoTotalEmpresaHoy > 0 ? (facturadoHoy / facturadoTotalEmpresaHoy) * 100 : 0;
      const cumpleMeta = porcentaje >= META_PORCENTAJE_ECOMMERCE;

      return {
        data: {
          facturadoMes,
          facturadoTotalEmpresaMes,
          porcentaje,
          facturadoHoy,
          facturadoTotalEmpresaHoy,
          porcentajeHoy,
          metaPorcentaje: META_PORCENTAJE_ECOMMERCE,
          cumpleMeta,
          puntosDelDia,
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error calculando facturación en vivo: ${error.message}`);
      return {
        data: {
          facturadoMes: 0,
          facturadoTotalEmpresaMes: 0,
          porcentaje: 0,
          facturadoHoy: 0,
          facturadoTotalEmpresaHoy: 0,
          porcentajeHoy: 0,
          metaPorcentaje: META_PORCENTAJE_ECOMMERCE,
          cumpleMeta: false,
          puntosDelDia: [],
        },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  async getAFacturarResumen(): Promise<{
    data: {
      desde: string;
      hasta: string;
      totalEmpresa: number;
      cantidadEmpresa: number;
      totalEcommerce: number;
      cantidadEcommerce: number;
      porcentajeEcommerce: number;
    };
    message: string;
    success: boolean;
  }> {
    try {
      const ahora = new Date();
      const hastaVentana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 3);
      const desde = '';
      const hasta = hastaVentana.toISOString().slice(0, 10);

      const [empresaRows, ecommerceRows] = await Promise.all([
        this.econtDb.executeQuery<{ total: number; cantidad: number }>(
          A_FACTURAR_TOTAL_EMPRESA_QUERY,
          [hasta],
        ),
        this.econtDb.executeQuery<{ total: number; cantidad: number }>(
          A_FACTURAR_ECOMMERCE_QUERY,
          [hasta],
        ),
      ]);

      const totalEmpresa = Number(empresaRows?.[0]?.total || 0);
      const cantidadEmpresa = Number(empresaRows?.[0]?.cantidad || 0);
      const totalEcommerce = Number(ecommerceRows?.[0]?.total || 0);
      const cantidadEcommerce = Number(ecommerceRows?.[0]?.cantidad || 0);
      const porcentajeEcommerce = totalEmpresa > 0 ? (totalEcommerce / totalEmpresa) * 100 : 0;

      return {
        data: {
          desde,
          hasta,
          totalEmpresa,
          cantidadEmpresa,
          totalEcommerce,
          cantidadEcommerce,
          porcentajeEcommerce,
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error calculando resumen a facturar: ${error.message}`);
      return {
        data: {
          desde: '',
          hasta: '',
          totalEmpresa: 0,
          cantidadEmpresa: 0,
          totalEcommerce: 0,
          cantidadEcommerce: 0,
          porcentajeEcommerce: 0,
        },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  async getAFacturarDetalleEcommerce(desdeParam?: string, hastaParam?: string): Promise<{
    data: any[];
    message: string;
    success: boolean;
  }> {
    try {
      const ahora = new Date();
      const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
      const hastaVentana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + 3);
      const desde = desdeParam || inicioMes.toISOString().slice(0, 10);
      const hasta = hastaParam || hastaVentana.toISOString().slice(0, 10);

      const rows = await this.econtDb.executeQuery(A_FACTURAR_ECOMMERCE_DETALLE_QUERY, [desde, hasta]);

      return { data: rows || [], message: 'Ok', success: true };
    } catch (error) {
      this.logger.error(`Error obteniendo detalle a facturar: ${error.message}`);
      return { data: [], message: `Error: ${error.message}`, success: false };
    }
  }

  async getAFacturarContadoCredito(
    desde: string,
    hasta: string,
  ): Promise<{
    data: {
      total: number;
      cantidad: number;
      totalContado: number;
      cantidadContado: number;
      porcentajeContado: number;
      totalCredito: number;
      cantidadCredito: number;
      porcentajeCredito: number;
    };
    message: string;
    success: boolean;
  }> {
    try {
      const rows = await this.econtDb.executeQuery<{
        total: string;
        total_contado: string;
        total_credito: string;
        cantidad: string;
        cantidad_contado: string;
        cantidad_credito: string;
      }>(A_FACTURAR_CONTADO_CREDITO_QUERY, [desde, hasta]);

      const total = Number(rows?.[0]?.total || 0);
      const totalContado = Number(rows?.[0]?.total_contado || 0);
      const totalCredito = Number(rows?.[0]?.total_credito || 0);

      return {
        data: {
          total,
          cantidad: Number(rows?.[0]?.cantidad || 0),
          totalContado,
          cantidadContado: Number(rows?.[0]?.cantidad_contado || 0),
          porcentajeContado: total > 0 ? (totalContado / total) * 100 : 0,
          totalCredito,
          cantidadCredito: Number(rows?.[0]?.cantidad_credito || 0),
          porcentajeCredito: total > 0 ? (totalCredito / total) * 100 : 0,
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error calculando desglose contado/crédito de a facturar: ${error.message}`);
      return {
        data: {
          total: 0,
          cantidad: 0,
          totalContado: 0,
          cantidadContado: 0,
          porcentajeContado: 0,
          totalCredito: 0,
          cantidadCredito: 0,
          porcentajeCredito: 0,
        },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  private async facturacionAlaHora(
    fecha: Date,
    horaLimite: Date,
  ): Promise<{
    facturadoDia: number;
    facturadoTotalEmpresaDia: number;
    porcentajeDia: number;
    facturadoMes: number;
    facturadoTotalEmpresaMes: number;
    porcentajeMes: number;
  }> {
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1, 0, 0, 0);
    const diaAnterior = new Date(fecha.getTime() - 24 * 60 * 60 * 1000);

    const [
      facturadoDia,
      facturadoTotalEmpresaDia,
      facturadoMesPrevio,
      facturadoTotalEmpresaMesPrevio,
    ] = await Promise.all([
      this.sumFacturacionHastaHora(fecha, horaLimite),
      this.sumFacturacionTotalEmpresaHastaHora(fecha, horaLimite),
      diaAnterior >= inicioMes
        ? this.sumFacturacion(inicioMes, diaAnterior)
        : Promise.resolve(0),
      diaAnterior >= inicioMes
        ? this.sumFacturacionTotalEmpresa(inicioMes, diaAnterior)
        : Promise.resolve(0),
    ]);

    const facturadoMes = facturadoMesPrevio + facturadoDia;
    const facturadoTotalEmpresaMes = facturadoTotalEmpresaMesPrevio + facturadoTotalEmpresaDia;
    const porcentajeDia =
      facturadoTotalEmpresaDia > 0 ? (facturadoDia / facturadoTotalEmpresaDia) * 100 : 0;
    const porcentajeMes =
      facturadoTotalEmpresaMes > 0 ? (facturadoMes / facturadoTotalEmpresaMes) * 100 : 0;

    return {
      facturadoDia,
      facturadoTotalEmpresaDia,
      porcentajeDia,
      facturadoMes,
      facturadoTotalEmpresaMes,
      porcentajeMes,
    };
  }

  async compararFecha(fechaStr: string): Promise<{
    data: {
      hoy: {
        fecha: string;
        facturadoDia: number;
        porcentajeDia: number;
        facturadoMes: number;
        porcentajeMes: number;
      };
      seleccionado: {
        fecha: string;
        facturadoDia: number;
        porcentajeDia: number;
        facturadoMes: number;
        porcentajeMes: number;
      };
      horaCorte: string;
    };
    message: string;
    success: boolean;
  }> {
    try {
      const ahora = new Date();
      const fechaSeleccionada = new Date(`${fechaStr}T00:00:00`);
      const horaLimiteSeleccionado = new Date(
        fechaSeleccionada.getFullYear(),
        fechaSeleccionada.getMonth(),
        fechaSeleccionada.getDate(),
        ahora.getHours(),
        ahora.getMinutes(),
        ahora.getSeconds(),
      );

      const [hoy, seleccionado] = await Promise.all([
        this.facturacionAlaHora(ahora, ahora),
        this.facturacionAlaHora(fechaSeleccionada, horaLimiteSeleccionado),
      ]);

      return {
        data: {
          hoy: {
            fecha: ahora.toISOString().slice(0, 10),
            facturadoDia: hoy.facturadoDia,
            porcentajeDia: hoy.porcentajeDia,
            facturadoMes: hoy.facturadoMes,
            porcentajeMes: hoy.porcentajeMes,
          },
          seleccionado: {
            fecha: fechaStr,
            facturadoDia: seleccionado.facturadoDia,
            porcentajeDia: seleccionado.porcentajeDia,
            facturadoMes: seleccionado.facturadoMes,
            porcentajeMes: seleccionado.porcentajeMes,
          },
          horaCorte: moment(ahora).format('HH:mm'),
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error comparando fecha: ${error.message}`);
      return {
        data: {
          hoy: { fecha: '', facturadoDia: 0, porcentajeDia: 0, facturadoMes: 0, porcentajeMes: 0 },
          seleccionado: {
            fecha: fechaStr,
            facturadoDia: 0,
            porcentajeDia: 0,
            facturadoMes: 0,
            porcentajeMes: 0,
          },
          horaCorte: '',
        },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  private async construirSnapshot(fecha: Date): Promise<Partial<HistorialDashboard>> {
    const inicioMes = new Date(fecha.getFullYear(), fecha.getMonth(), 1, 0, 0, 0);

    const [
      facturadoDiaEcommerce,
      facturadoDiaTotalEmpresa,
      facturadoMesEcommerce,
      facturadoMesTotalEmpresa,
      meta,
    ] = await Promise.all([
      this.sumFacturacion(fecha, fecha),
      this.sumFacturacionTotalEmpresa(fecha, fecha),
      this.sumFacturacion(inicioMes, fecha),
      this.sumFacturacionTotalEmpresa(inicioMes, fecha),
      this.getMetaMensual(),
    ]);

    const porcentajeDia =
      facturadoDiaTotalEmpresa > 0 ? (facturadoDiaEcommerce / facturadoDiaTotalEmpresa) * 100 : 0;
    const porcentajeMes =
      facturadoMesTotalEmpresa > 0 ? (facturadoMesEcommerce / facturadoMesTotalEmpresa) * 100 : 0;
    const metaMensual = Number(meta.monto_meta || 0);
    // Sin cap a 100: a diferencia del widget en vivo, el historial no debe
    // perder información de meses que superaron la meta mensual.
    const porcentajeMetaAlcanzado = metaMensual > 0 ? (facturadoMesEcommerce / metaMensual) * 100 : 0;
    const cumpleMetaEcommerce = porcentajeMes >= META_PORCENTAJE_ECOMMERCE;

    return {
      fecha: fecha.toISOString().slice(0, 10),
      facturado_dia_ecommerce: facturadoDiaEcommerce,
      facturado_dia_total_empresa: facturadoDiaTotalEmpresa,
      porcentaje_ecommerce_dia: porcentajeDia,
      facturado_mes_acumulado_ecommerce: facturadoMesEcommerce,
      facturado_mes_acumulado_total_empresa: facturadoMesTotalEmpresa,
      porcentaje_ecommerce_mes: porcentajeMes,
      meta_mensual: metaMensual,
      porcentaje_meta_alcanzado: porcentajeMetaAlcanzado,
      cumple_meta_ecommerce: cumpleMetaEcommerce,
    };
  }

  async generarSnapshotDiario(fechaStr?: string): Promise<{
    data: Partial<HistorialDashboard> | null;
    message: string;
    success: boolean;
  }> {
    try {
      // Sin fechaStr, snapshotea el día que acaba de cerrar en horario
      // Paraguay (el cron automático corre a las 00:00 America/Asuncion).
      const fecha = fechaStr
        ? new Date(`${fechaStr}T00:00:00`)
        : moment().tz('America/Asuncion').subtract(1, 'day').startOf('day').toDate();

      const snapshot = await this.construirSnapshot(fecha);
      const existente = await this.historialRepository.findOne({
        where: { fecha: snapshot.fecha },
      });
      const guardado = await this.historialRepository.save(
        this.historialRepository.create({ ...existente, ...snapshot }),
      );

      return { data: guardado, message: 'Snapshot generado', success: true };
    } catch (error) {
      this.logger.error(`Error generando snapshot diario: ${error.message}`);
      return { data: null, message: `Error: ${error.message}`, success: false };
    }
  }

  // 03:00 UTC = 00:00 America/Asuncion (offset fijo -03:00, sin DST, mismo
  // criterio que la conexión a MariaDB). El contenedor corre en UTC sin TZ
  // configurada, por eso el cálculo de zona horaria se hace en código
  // (moment-timezone) en vez de confiar en la hora local del decorador.
  @Cron('0 3 * * *')
  async snapshotDiarioAutomatico(): Promise<void> {
    try {
      const resultado = await this.generarSnapshotDiario();
      if (!resultado.success) {
        this.logger.error(`Snapshot diario automático falló: ${resultado.message}`);
      }
    } catch (error) {
      this.logger.error(`Error en snapshot diario automático: ${error.message}`);
    }
  }

  async listHistorial(
    desde?: string,
    hasta?: string,
  ): Promise<{ data: HistorialDashboard[]; message: string; success: boolean }> {
    try {
      const where = desde && hasta ? { fecha: Between(desde, hasta) } : {};
      const data = await this.historialRepository.find({
        where,
        order: { fecha: 'DESC' },
        take: 365,
      });
      return { data, message: 'Ok', success: true };
    } catch (error) {
      this.logger.error(`Error listando historial: ${error.message}`);
      return { data: [], message: `Error: ${error.message}`, success: false };
    }
  }

  async getFacturacionContadoCredito(
    desde: string,
    hasta: string,
    modoFecha: 'agendamiento' | 'solicitud' = 'agendamiento',
  ): Promise<{
    data: {
      total: number;
      cantidad: number;
      totalContado: number;
      cantidadContado: number;
      porcentajeContado: number;
      totalCredito: number;
      cantidadCredito: number;
      porcentajeCredito: number;
    };
    message: string;
    success: boolean;
  }> {
    try {
      const columnaFecha = modoFecha === 'solicitud' ? 'sc.fecha' : 'sc.age_frecepcion';
      const rows = await this.econtDb.executeQuery<{
        total: string;
        total_contado: string;
        total_credito: string;
        cantidad: string;
        cantidad_contado: string;
        cantidad_credito: string;
      }>(buildFacturacionContadoCreditoQuery(columnaFecha), [desde, hasta]);

      const total = Number(rows?.[0]?.total || 0);
      const totalContado = Number(rows?.[0]?.total_contado || 0);
      const totalCredito = Number(rows?.[0]?.total_credito || 0);

      return {
        data: {
          total,
          cantidad: Number(rows?.[0]?.cantidad || 0),
          totalContado,
          cantidadContado: Number(rows?.[0]?.cantidad_contado || 0),
          porcentajeContado: total > 0 ? (totalContado / total) * 100 : 0,
          totalCredito,
          cantidadCredito: Number(rows?.[0]?.cantidad_credito || 0),
          porcentajeCredito: total > 0 ? (totalCredito / total) * 100 : 0,
        },
        message: 'Ok',
        success: true,
      };
    } catch (error) {
      this.logger.error(`Error calculando desglose contado/crédito: ${error.message}`);
      return {
        data: {
          total: 0,
          cantidad: 0,
          totalContado: 0,
          cantidadContado: 0,
          porcentajeContado: 0,
          totalCredito: 0,
          cantidadCredito: 0,
          porcentajeCredito: 0,
        },
        message: `Error: ${error.message}`,
        success: false,
      };
    }
  }

  private listaDeFechas(desde: string, hasta: string): string[] {
    const fechas: string[] = [];
    const cursor = new Date(`${desde}T00:00:00`);
    const fin = new Date(`${hasta}T00:00:00`);
    while (cursor <= fin) {
      fechas.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
    return fechas;
  }

  private async guardarSnapshotFecha(fechaStr: string): Promise<void> {
    const fecha = new Date(`${fechaStr}T00:00:00`);
    const snapshot = await this.construirSnapshot(fecha);
    const existente = await this.historialRepository.findOne({ where: { fecha: snapshot.fecha } });
    await this.historialRepository.save(
      this.historialRepository.create({ ...existente, ...snapshot }),
    );
  }

  async recalcularHistorial(
    desde: string,
    hasta: string,
  ): Promise<{ data: HistorialDashboard[]; message: string; success: boolean }> {
    try {
      const fechas = this.listaDeFechas(desde, hasta);
      const tamañoLote = 5;
      for (let i = 0; i < fechas.length; i += tamañoLote) {
        const lote = fechas.slice(i, i + tamañoLote);
        await Promise.all(lote.map((fechaStr) => this.guardarSnapshotFecha(fechaStr)));
      }
      return this.listHistorial(desde, hasta);
    } catch (error) {
      this.logger.error(`Error recalculando historial: ${error.message}`);
      return { data: [], message: `Error: ${error.message}`, success: false };
    }
  }
}
