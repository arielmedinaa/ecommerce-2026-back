import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from '../../strategies/google.strategy';

@Module({
  imports: [
    MicroserviceModule.register('AUTH_SERVICE'),
    MicroserviceModule.register('CART_SERVICE'),
    PassportModule,
  ],
  controllers: [AuthController, UserController],
  providers: [GoogleStrategy],
  exports: [],
})
export class AuthModule {}
