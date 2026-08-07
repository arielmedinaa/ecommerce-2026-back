import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './controller/dashboard.controller';
import { DashboardStatsService } from './service/dashboard-stats.service';
import { MetaVentas } from './schemas/meta-ventas.schema';
import { IngresoExterno } from './schemas/ingreso-externo.schema';
import { EcontDatabaseModule } from '@shared/config/database/econt.database.module';

@Module({
  imports: [
    EcontDatabaseModule,
    TypeOrmModule.forFeature([MetaVentas, IngresoExterno], 'WRITE_CONNECTION'),
  ],
  controllers: [DashboardController],
  providers: [DashboardStatsService],
  exports: [DashboardStatsService],
})
export class DashboardModule {}
