import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { GuestService } from './service/guest.service';
import { UserCouponService } from './service/user-coupon.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MariaDbModule } from './config/mariadb.module';
import { ConfigModule } from '@nestjs/config';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { UserController } from './controller/user.controller';
import { UserService } from './service/user.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MariaDbModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '7d' },
    }),
    MicroserviceModule.forRoot([
      'CONTENT_SERVICE',
    ]),
  ],
  controllers: [AuthController, UserController],
  providers: [AuthService, UserService, GuestService, UserCouponService, GoogleStrategy, JwtStrategy, ResilientService],
  exports: [AuthService, GuestService, UserCouponService, UserService],
})
export class AuthModule {}
