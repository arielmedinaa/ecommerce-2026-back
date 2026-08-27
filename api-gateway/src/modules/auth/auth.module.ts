import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './controllers/auth.controller';
import { UserController } from './controllers/user.controller';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from '../../strategies/google.strategy';
import { RolesGuard } from '@gateway/common/guards/roles.guard';

@Module({
  imports: [
    MicroserviceModule.register('AUTH_SERVICE'),
    MicroserviceModule.register('CART_SERVICE'),
    MicroserviceModule.register('CONTENT_SERVICE'),
    MicroserviceModule.register('PRODUCTS_SERVICE'),
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController, UserController],
  providers: [GoogleStrategy, RolesGuard],
  exports: [],
})
export class AuthModule {}
