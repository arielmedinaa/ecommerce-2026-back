import { Module } from '@nestjs/common';
import { HomeModule } from './home/home.module';
import { LandingsModule } from './landings/landings.module';
import { ConfigModule } from '@nestjs/config';
import { VerticalesModule } from './verticales/verticales.module';
import { MariaDbModule } from './config/mariadb.module';
import { CuponesModule } from './cupones/cupones.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HomeModule,
    LandingsModule,
    VerticalesModule,
    CuponesModule,
    MariaDbModule
  ],
  exports: [
    HomeModule,
    LandingsModule,
    VerticalesModule,
  ],
})
export class ContentModule {}
