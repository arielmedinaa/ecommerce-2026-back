import { Module } from '@nestjs/common';
import { HomeModule } from './home/home.module';
import { LandingsModule } from './landings/landings.module';
import { DatabaseModule } from '@shared/config/database/database.module';
import { VerticalesModule } from './verticales/verticales.module';
import { VerticalesService } from './verticales/service/verticales.service';
import { MariaDbModule } from './config/mariadb.module';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    HomeModule,
    LandingsModule,
    VerticalesModule,
    MariaDbModule
  ],
  exports: [
    HomeModule,
    LandingsModule,
    VerticalesModule,
  ],
  providers: [VerticalesService],
})
export class ContentModule {}
