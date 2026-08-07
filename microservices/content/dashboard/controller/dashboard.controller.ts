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
