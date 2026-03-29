import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Cart } from '../schemas/cart.schemas';
import { Llave } from '../schemas/llave.schemas';
import { Transaccion } from '../schemas/transaccion.schemas';
import { Order } from '../schemas/order.schemas';
import { OrderItem } from '../schemas/order-item.schemas';
import { CartError } from '../schemas/errors/cart-error.entity';
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
        entities: [Cart, Llave, Transaccion, Order, OrderItem, CartError],
        synchronize: true,
        logging: false,
        timezone: '-03:00',
        charset: 'utf8mb4',
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
        entities: [Cart, Llave, Transaccion, Order, OrderItem, CartError],
        synchronize: true,
        logging: false,
        timezone: '-03:00',
        charset: 'utf8mb4',
      }),
      inject: [ConfigService],
    });
  }

  static forFeature(): DynamicModule {
    return TypeOrmModule.forFeature(
      [Cart, Llave, Transaccion, Order, OrderItem, CartError],
      'WRITE_CONNECTION',
    );
  }

  static forFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature(
      [Cart, Llave, Transaccion, Order, OrderItem, CartError],
      'READ_CONNECTION',
    );
  }
}
