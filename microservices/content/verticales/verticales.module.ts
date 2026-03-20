import { Module } from '@nestjs/common';
import { VerticalController } from './controller/verticales.controller';
import { MariaDbModule } from '@content/config/mariadb.module';
import { VerticalesService } from './service/verticales.service';
import { VerticalValidation } from './service/valid/vertical.validation';

@Module({
    imports: [
        MariaDbModule.forFeature(),
        MariaDbModule.forFeatureRead()
    ],
    controllers: [VerticalController],
    providers: [VerticalesService, VerticalValidation],
    exports: [VerticalesService, VerticalValidation],
})
export class VerticalesModule {}
