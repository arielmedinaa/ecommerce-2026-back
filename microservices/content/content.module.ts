import { Module } from '@nestjs/common';
import { HomeModule } from './home/home.module';
import { LandingsModule } from './landings/landings.module';
import { ConfigModule } from '@nestjs/config';
import { VerticalesModule } from './verticales/verticales.module';
import { MariaDbModule } from './config/mariadb.module';
import { CuponesModule } from './cupones/cupones.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    HomeModule,
    LandingsModule,
    VerticalesModule,
    CuponesModule,
    EventsModule,
    MariaDbModule,
  ],
  exports: [HomeModule, LandingsModule, VerticalesModule, EventsModule],
})
export class ContentModule {}
