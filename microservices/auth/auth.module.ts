import { Module } from '@nestjs/common';
import { AuthController } from './controller/auth.controller';
import { AuthService } from './service/auth.service';
import { GuestService } from './service/guest.service';
import { DatabaseModule } from '@shared/config/database/database.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { MariaDbModule } from './config/mariadb.module';

@Module({
  imports: [
    DatabaseModule.forRoot(),
    MariaDbModule,
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, GuestService, GoogleStrategy, JwtStrategy],
  exports: [AuthService, GuestService],
})
export class AuthModule {}
