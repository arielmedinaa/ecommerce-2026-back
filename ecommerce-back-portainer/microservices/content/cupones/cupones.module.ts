import { Module } from '@nestjs/common';
import { CuponesController } from './controller/cupones.controller';
import { CuponesService } from './service/cupones.service';
import { MariaDbModule } from '@content/config/mariadb.module';

@Module({
  imports: [
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead()
  ],
  controllers: [CuponesController],
  providers: [CuponesService],
  exports: [CuponesService],
})
export class CuponesModule {}
