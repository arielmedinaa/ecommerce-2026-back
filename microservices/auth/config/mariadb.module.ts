import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../schemas/user.schemas';
import { MariaDbConnectionService } from './mariadb-connection.service';
import { UserCoupon } from '@auth/schemas/user-coupon.schema';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT', 3306),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [User, UserCoupon],
        synchronize: process.env.SYNCRONICE === 'true', // Temporal para desarrollo
        logging: false,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, UserCoupon]),
  ],
  providers: [MariaDbConnectionService],
  exports: [TypeOrmModule],
})
export class MariaDbModule {}
