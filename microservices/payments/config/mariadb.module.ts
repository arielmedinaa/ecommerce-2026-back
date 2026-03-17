import { DynamicModule, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Payment } from '../schemas/payments.schema';
import { MariaDbConnectionService } from './mariadb-connection.service';

@Module({
  imports: [
    MariaDbModule.forWrite(),
    MariaDbModule.forRead(),
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead(),
  ],
  providers: [MariaDbConnectionService],
  exports: [TypeOrmModule],
})
export class MariaDbModule {
  static forWrite(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'WRITE_CONNECTION',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [Payment],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    });
  }

  static forRead(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'READ_CONNECTION',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST_REPLIC'),
        port: configService.get<number>('DATABASE_PORT_REPLIC'),
        username: configService.get<string>('DATABASE_USER_REPLIC'),
        password: configService.get<string>('DATABASE_PASSWORD_REPLIC'),
        database: configService.get<string>('DATABASE_NAME_REPLIC'),
        entities: [Payment],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    });
  }

  static forFeature(): DynamicModule {
    return TypeOrmModule.forFeature([Payment], 'WRITE_CONNECTION');
  }

  static forFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature([Payment], 'READ_CONNECTION');
  }
}
