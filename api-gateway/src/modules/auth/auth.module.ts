import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from '../../strategies/google.strategy';

@Module({
  imports: [
    MicroserviceModule.register('AUTH_SERVICE'),
    PassportModule,
  ],
  controllers: [AuthController],
  providers: [GoogleStrategy],
  exports: [],
})
export class AuthModule {}
