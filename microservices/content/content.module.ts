import { Module } from '@nestjs/common';
import { HomeModule } from './home/home.module';
import { LandingsModule } from './landings/landings.module';
import { DatabaseModule } from '@shared/config/database/database.module';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    HomeModule,
    LandingsModule,
  ],
  exports: [
    HomeModule,
    LandingsModule,
  ],
})
export class ContentModule {}
