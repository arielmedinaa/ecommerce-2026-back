import { Module } from '@nestjs/common';
import { EventsController } from './controller/events.controller';
import { EventsService } from './service/events.service';
import { MariaDbModule } from '@content/config/mariadb.module';
import { ConditionsModule } from './conditions/conditions.module';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead(),
    ConditionsModule,
    MicroserviceModule.register('CONTENT'),
    MicroserviceModule.forRoot(['AUTH_SERVICE']),
  ],
  controllers: [EventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
