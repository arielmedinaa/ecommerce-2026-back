import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EcontDatabaseService } from '@shared/config/database/econt.database.module';
import { MetaVentas } from '../schemas/meta-ventas.schema';
import { IngresoExterno } from '../schemas/ingreso-externo.schema';
import { Between } from 'typeorm';

// Replica el filtro anti-doble-conteo de `proc_obtener_ventas_totales`: suma
// gravada5+gravada10+exenta de ventacab (unido a la solicitud del ecommerce
// via ssolicitud=solicitudcab_secuencia), excluyendo filas cuota=3 y sus
// referencias inversas.
const FACTURACION_QUERY = `
  SELECT COALESCE(SUM(vc.gravada5 + vc.gravada10 + vc.exenta), 0) AS total
  FROM ventacab vc
  INNER JOIN cs_solicitud_ecommerce_cabecera cab ON cab.solicitudcab_secuencia = vc.ssolicitud
  WHERE vc.fecha BETWEEN ? AND ?
    AND vc.cuota <> 3
    AND NOT EXISTS (
      SELECT 1 FROM ventacab vc2
      WHERE vc2.cuota = 3 AND vc2.factipo = vc.comprobante AND vc2.facnumero = vc.numero
    )
`;

@Injectable()
export class DashboardStatsService {
  private readonly logger = new Logger(DashboardStatsService.name);

  constructor(
    private readonly econtDb: EcontDatabaseService,
    @InjectRepository(MetaVentas, 'WRITE_CONNECTION')
    private readonly metaVentasRepository: Repository<MetaVentas>,
    @InjectRepository(IngresoExterno, 'WRITE_CONNECTION')
    private readonly ingresoExternoRepository: Repository<IngresoExterno>,
  ) {}

  private async sumFacturacion(desde: Date, hasta: Date): Promise<number> {
    const rows = await this.econtDb.executeQuery<{ total: number }>(FACTURACION_QUERY, [
      desde.toISOString().slice(0, 19).replace('T', ' '),
      hasta.toISOString().slice(0, 19).replace('T', ' '),
    ]);
    return Number(rows?.[0]?.total || 0);
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
        this.sumFacturacion(inicioMes, ahora),
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
}
