import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DashboardStatsService } from '../service/dashboard-stats.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardStatsService: DashboardStatsService) {}

  @MessagePattern({ cmd: 'get_dashboard_facturacion' })
  getDashboardFacturacion() {
    return this.dashboardStatsService.getFacturacionMensual();
  }

  @MessagePattern({ cmd: 'get_dashboard_porcentaje_ecommerce' })
  getDashboardPorcentajeEcommerce() {
    return this.dashboardStatsService.getPorcentajeEcommerceDiario();
  }

  @MessagePattern({ cmd: 'get_dashboard_historial' })
  getDashboardHistorial(@Payload() data: { desde?: string; hasta?: string }) {
    return this.dashboardStatsService.listHistorial(data?.desde, data?.hasta);
  }

  @MessagePattern({ cmd: 'recalcular_dashboard_historial' })
  recalcularDashboardHistorial(@Payload() data: { desde: string; hasta: string }) {
    return this.dashboardStatsService.recalcularHistorial(data.desde, data.hasta);
  }

  @MessagePattern({ cmd: 'get_dashboard_historial_contado_credito' })
  getDashboardHistorialContadoCredito(
    @Payload() data: { desde: string; hasta: string; modoFecha?: 'agendamiento' | 'solicitud' },
  ) {
    return this.dashboardStatsService.getFacturacionContadoCredito(
      data.desde,
      data.hasta,
      data.modoFecha,
    );
  }

  @MessagePattern({ cmd: 'get_dashboard_facturacion_en_vivo' })
  getDashboardFacturacionEnVivo() {
    return this.dashboardStatsService.getFacturacionEnVivo();
  }

  @MessagePattern({ cmd: 'get_dashboard_a_facturar_resumen' })
  getDashboardAFacturarResumen() {
    return this.dashboardStatsService.getAFacturarResumen();
  }

  @MessagePattern({ cmd: 'get_dashboard_a_facturar_detalle' })
  getDashboardAFacturarDetalle(@Payload() payload: { desde?: string; hasta?: string }) {
    return this.dashboardStatsService.getAFacturarDetalleEcommerce(payload?.desde, payload?.hasta);
  }

  @MessagePattern({ cmd: 'get_dashboard_a_facturar_contado_credito' })
  getDashboardAFacturarContadoCredito(@Payload() payload: { desde: string; hasta: string }) {
    return this.dashboardStatsService.getAFacturarContadoCredito(payload.desde, payload.hasta);
  }

  @MessagePattern({ cmd: 'get_dashboard_comparar_fecha' })
  getDashboardCompararFecha(@Payload() data: { fecha: string }) {
    return this.dashboardStatsService.compararFecha(data?.fecha);
  }

  @MessagePattern({ cmd: 'set_meta_ventas' })
  setMetaVentas(@Payload() data: { monto: number; actualizadoPor: string }) {
    return this.dashboardStatsService.setMetaMensual(data.monto, data.actualizadoPor);
  }

  @MessagePattern({ cmd: 'create_ingreso_externo' })
  createIngresoExterno(
    @Payload() data: { monto: number; concepto: string; fecha: string; creadoPor: string },
  ) {
    return this.dashboardStatsService.createIngresoExterno(data);
  }

  @MessagePattern({ cmd: 'delete_ingreso_externo' })
  deleteIngresoExterno(@Payload() data: { id: number }) {
    return this.dashboardStatsService.deleteIngresoExterno(data.id);
  }
}
