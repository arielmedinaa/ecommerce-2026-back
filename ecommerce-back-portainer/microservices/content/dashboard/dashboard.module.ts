import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { DashboardController } from './controller/dashboard.controller';
import { DashboardStatsService } from './service/dashboard-stats.service';
import { MetaVentas } from './schemas/meta-ventas.schema';
import { IngresoExterno } from './schemas/ingreso-externo.schema';
import { HistorialDashboard } from './schemas/historial-dashboard.schema';
import { DashboardWidget } from './schemas/dashboard-widget.schema';
import { DashboardWidgetsController } from './widgets/controller/dashboard-widgets.controller';
import { DashboardWidgetsService } from './widgets/service/dashboard-widgets.service';
import { WidgetQueryService } from './widgets/service/widget-query.service';
import { DynamicQueryBuilderService } from './widgets/service/dynamic-query-builder.service';
import { EcontDatabaseModule } from '@shared/config/database/econt.database.module';
import { CartDatabaseModule } from '@shared/config/database/cart.database.module';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    EcontDatabaseModule,
    CartDatabaseModule,
    MicroserviceModule.forRoot(['PRODUCTS_SERVICE', 'CART_SERVICE', 'AUTH_SERVICE']),
    TypeOrmModule.forFeature(
      [MetaVentas, IngresoExterno, HistorialDashboard, DashboardWidget],
      'WRITE_CONNECTION',
    ),
  ],
  controllers: [DashboardController, DashboardWidgetsController],
  providers: [DashboardStatsService, DashboardWidgetsService, WidgetQueryService, DynamicQueryBuilderService],
  exports: [DashboardStatsService, DashboardWidgetsService, WidgetQueryService, DynamicQueryBuilderService],
})
export class DashboardModule {}
