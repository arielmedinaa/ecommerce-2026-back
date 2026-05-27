import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Vertical } from '@content/verticales/schemas/verticales.schemas';
import { Landing } from '@content/landings/schemas/landings.schemas';
import { Formato } from '@content/landings/schemas/formatos.schema';
import { LandingError } from '@content/landings/schemas/errors/landings.error.schema';
import { Cupon } from '@content/cupones/schemas/cupon.schema';
import { CuponesPorProducto } from '@content/cupones/schemas/cupon-productos.schema';
import { Event } from '@content/events/schemas/event.schema';
import { EventProduct } from '@content/events/schemas/event-product.schema';
import { Order } from '@content/events/schemas/order.schema';
import { OrderItem } from '@content/events/schemas/order-item.schema';
import { EventCondition } from '@content/events/schemas/event-condition.schema';
import { HomeSection } from '@content/home/schemas/home-section.schema';
import { Promotion } from '@content/promotions/schemas/promotion.schema';
import { PromotionProduct } from '@content/promotions/schemas/promotion-product.schema';
import { PromotionVisit } from '@content/promotions/schemas/promotion-visit.schema';

@Module({
  imports: [
    MariaDbModule.forWrite(),
    MariaDbModule.forRead(),
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead(),
  ],
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
        entities: [
          Vertical,
          Landing,
          Formato,
          LandingError,
          Cupon,
          CuponesPorProducto,
          Event,
          EventProduct,
          Order,
          OrderItem,
          EventCondition,
          HomeSection,
          Promotion,
          PromotionProduct,
          PromotionVisit,
        ],
        synchronize: process.env.SYNCRONICE === 'true',
        logging: process.env.SYNCRONICE === 'true',
        timezone: '-03:00',
        charset: 'utf8mb4',
        keepConnectionAlive: true,
        retryAttempts: Number(process.env.DB_RETRY_ATTEMPTS || 10),
        retryDelay: Number(process.env.DB_RETRY_DELAY_MS || 3000),
        extra: {
          connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
        },
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
        entities: [
          Vertical,
          Landing,
          Formato,
          LandingError,
          Cupon,
          CuponesPorProducto,
          Event,
          EventProduct,
          Order,
          OrderItem,
          EventCondition,
          HomeSection,
          Promotion,
          PromotionProduct,
          PromotionVisit,
        ],
        synchronize: process.env.SYNCRONICE === 'true',
        logging: process.env.SYNCRONICE === 'true',
        timezone: '-03:00',
        charset: 'utf8mb4',
        keepConnectionAlive: true,
        retryAttempts: Number(process.env.DB_RETRY_ATTEMPTS || 10),
        retryDelay: Number(process.env.DB_RETRY_DELAY_MS || 3000),
        extra: {
          connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
        },
      }),
      inject: [ConfigService],
    });
  }

  static forFeature(): DynamicModule {
    return TypeOrmModule.forFeature(
      [
        Vertical,
        Landing,
        Formato,
        LandingError,
        Cupon,
        CuponesPorProducto,
        Event,
        EventProduct,
        Order,
        OrderItem,
        EventCondition,
        HomeSection,
        Promotion,
        PromotionProduct,
        PromotionVisit,
      ],
      'WRITE_CONNECTION',
    );
  }

  static forFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature(
      [
        Vertical,
        Landing,
        Formato,
        LandingError,
        Cupon,
        CuponesPorProducto,
        Event,
        EventProduct,
        Order,
        OrderItem,
        EventCondition,
        HomeSection,
        Promotion,
        PromotionProduct,
        PromotionVisit,
      ],
      'READ_CONNECTION',
    );
  }
}
