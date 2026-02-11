import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    MicroserviceModule.register('AUTH_SERVICE'),
  ],
  controllers: [AuthController],
  exports: [],
})
export class AuthModule {}
