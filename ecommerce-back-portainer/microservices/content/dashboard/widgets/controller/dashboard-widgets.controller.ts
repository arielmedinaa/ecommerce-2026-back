import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DashboardWidgetsService } from '../service/dashboard-widgets.service';
import { WidgetQueryService } from '../service/widget-query.service';

@Controller()
export class DashboardWidgetsController {
  constructor(
    private readonly dashboardWidgetsService: DashboardWidgetsService,
    private readonly widgetQueryService: WidgetQueryService,
  ) {}

  @MessagePattern({ cmd: 'list_dashboard_widgets' })
  listDashboardWidgets() {
    return this.dashboardWidgetsService.listWidgets();
  }

  @MessagePattern({ cmd: 'create_dashboard_widget' })
  createDashboardWidget(
    @Payload() data: { nombre: string; tipo: 'predefinido' | 'personalizado'; config: any; tamano: string },
  ) {
    return this.dashboardWidgetsService.createWidget(data as any);
  }

  @MessagePattern({ cmd: 'update_dashboard_widget' })
  updateDashboardWidget(
    @Payload() data: { id: number; nombre: string; tipo: 'predefinido' | 'personalizado'; config: any; tamano: string; icono?: string; color?: string },
  ) {
    return this.dashboardWidgetsService.updateWidget(data.id, data as any);
  }

  @MessagePattern({ cmd: 'delete_dashboard_widget' })
  deleteDashboardWidget(@Payload() data: { id: number }) {
    return this.dashboardWidgetsService.deleteWidget(data.id);
  }

  @MessagePattern({ cmd: 'preview_dashboard_widget_query' })
  previewDashboardWidgetQuery(@Payload() data: { metrica: string; filtros: any[] }) {
    return this.widgetQueryService.previewQuery(data);
  }

  @MessagePattern({ cmd: 'list_widget_catalog' })
  listWidgetCatalog() {
    return this.widgetQueryService.getCatalogo();
  }

  @MessagePattern({ cmd: 'list_entity_catalog' })
  listEntityCatalog() {
    return this.widgetQueryService.getEntityCatalog();
  }

  @MessagePattern({ cmd: 'list_predefined_stats' })
  listPredefinedStats() {
    return this.dashboardWidgetsService.listEstadisticasPredefinidas();
  }
}
