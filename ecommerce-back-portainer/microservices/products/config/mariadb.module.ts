import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Product } from '../schemas/products/product.schemas';
import { Promo } from '../schemas/promos/promo.schemas';
import { Oferta } from '../schemas/ofertas/oferta.schemas';
import { ProductoOferta } from '../schemas/ofertas/producto-oferta.schemas';
import { ProductsImage } from '../schemas/products/products-image.schema';
import { SearchTerm } from '../schemas/search/search-term.schema';
import { ProductsSello } from '../schemas/products/products-sello.schema';
import { ProductsSeller } from '../schemas/products-seller/products-seller.schema';
import { ProductsExcelHistorial } from '../schemas/products/products-excel-historial.schema';
import { ProductsExcelHistorialDetalle } from '../schemas/products/products-excel-historial-detalle.schema';
import { Proveedor } from '../schemas/products-seller/proveedor.schema';
import { ProveedorDocumento } from '../schemas/products-seller/proveedor-documento.schema';
import { ProveedorApiToken } from '../schemas/products-seller/proveedor-api-token.schema';
import { CmsCombo } from '../schemas/combos/cms-combo.schemas';
import { CmsComboDetalle } from '../schemas/combos/cms-combo-detalle.schemas';
import { EcontComboImagen } from '../schemas/combos/econt-combo-imagen.schemas';
import { Notification } from '../schemas/notifications/notification.schema';
import { PushSubscription } from '../schemas/notifications/push-subscription.schema';

@Module({
  imports: [],
  exports: [TypeOrmModule],
})
export class MariaDbModule {
  static forWrite(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'WRITE_CONNECTION',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('ECONT_DB_HOST'),
        port: configService.get<number>('ECONT_DB_PORT', 3306),
        username: configService.get<string>('ECONT_DB_USER'),
        password: configService.get<string>('ECONT_DB_PASSWORD'),
        database: configService.get<string>('ECONT_DB_DATABASE'),
        entities: [Product, Promo, Oferta, ProductoOferta, ProductsImage],
        synchronize: false,
        logging: false,
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

  static forWriteEcommerceProducts(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT', 3306),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [ProductsImage, SearchTerm, ProductsSello, ProductsSeller, ProductsExcelHistorial, ProductsExcelHistorialDetalle, Proveedor, ProveedorDocumento, ProveedorApiToken, Notification, PushSubscription],
        synchronize: process.env.SYNCRONICE === 'true',
        logging: process.env.SYNCRONICE === 'true',
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

  static forReadEcommerceProducts(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'READ_ECOMMERCE_PRODUCTS_CONNECTION',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT', 3306),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [ProductsImage, SearchTerm, ProductsSello, ProductsSeller, ProductsExcelHistorial, ProductsExcelHistorialDetalle, Proveedor, ProveedorDocumento, ProveedorApiToken, Notification, PushSubscription],
        synchronize: process.env.SYNCRONICE === 'true',
        logging: process.env.SYNCRONICE === 'true',
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
        host: configService.get<string>('ECONT_DB_HOST'),
        port: configService.get<number>('ECONT_DB_PORT'),
        username: configService.get<string>('ECONT_DB_USER'),
        password: configService.get<string>('ECONT_DB_PASSWORD'),
        database: configService.get<string>('ECONT_DB_DATABASE'),
        entities: [Product, Promo, Oferta, ProductoOferta, ProductsImage],
        synchronize: false,
        logging: false,
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

  static forOfertasWrite(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'OFERTAS_CONNECTION',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT', 3306),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [Oferta, ProductoOferta],
        synchronize: process.env.SYNCRONICE === 'true',
        logging: process.env.SYNCRONICE === 'true',
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

  static forOfertasRead(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'OFERTAS_CONNECTION_READ',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST_REPLIC'),
        port: configService.get<number>('DATABASE_PORT_REPLIC', 3306),
        username: configService.get<string>('DATABASE_USER_REPLIC'),
        password: configService.get<string>('DATABASE_PASSWORD_REPLIC'),
        database: configService.get<string>('DATABASE_NAME_REPLIC'),
        entities: [Oferta, ProductoOferta],
        synchronize: process.env.SYNCRONICE === 'true',
        logging: process.env.SYNCRONICE === 'true',
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

  static forCombosWrite(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'COMBOS_CONNECTION',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT', 3306),
        username: configService.get<string>('DATABASE_USER'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('COMBOS_DB_NAME', 'combos'),
        entities: [CmsCombo, CmsComboDetalle, EcontComboImagen],
        synchronize: process.env.SYNCRONICE === 'true',
        logging: process.env.SYNCRONICE === 'true',
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

  static forCombosRead(): DynamicModule {
    return TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      name: 'COMBOS_CONNECTION_READ',
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get<string>('DATABASE_HOST_REPLIC'),
        port: configService.get<number>('DATABASE_PORT_REPLIC', 3306),
        username: configService.get<string>('DATABASE_USER_REPLIC'),
        password: configService.get<string>('DATABASE_PASSWORD_REPLIC'),
        database: configService.get<string>('COMBOS_DB_NAME_REPLIC', 'combos'),
        entities: [CmsCombo, CmsComboDetalle, EcontComboImagen],
        synchronize: process.env.SYNCRONICE === 'true',
        logging: process.env.SYNCRONICE === 'true',
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

  static forCombosFeature(): DynamicModule {
    return TypeOrmModule.forFeature([CmsCombo, CmsComboDetalle, EcontComboImagen], 'COMBOS_CONNECTION');
  }

  static forCombosFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature([CmsCombo, CmsComboDetalle, EcontComboImagen], 'COMBOS_CONNECTION_READ');
  }

  static forFeature(): DynamicModule {
    return TypeOrmModule.forFeature([Product, Promo, ProductsImage], 'WRITE_CONNECTION');
  }

  static forEcommerceProductsFeature(): DynamicModule {
    return TypeOrmModule.forFeature([ProductsImage, SearchTerm, ProductsSello, ProductsSeller, ProductsExcelHistorial, ProductsExcelHistorialDetalle, Proveedor, ProveedorDocumento, ProveedorApiToken, Notification, PushSubscription], 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION');
  }

  static forEcommerceProductsFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature([ProductsImage, SearchTerm, ProductsSello, ProductsSeller, ProductsExcelHistorial, ProductsExcelHistorialDetalle, Proveedor, ProveedorDocumento, ProveedorApiToken, Notification, PushSubscription], 'READ_ECOMMERCE_PRODUCTS_CONNECTION');
  }
  
  static forOfertasFeature(): DynamicModule {
    return TypeOrmModule.forFeature([Oferta, ProductoOferta], 'OFERTAS_CONNECTION');
  }
  
  static forOfertasFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature([Oferta, ProductoOferta], 'OFERTAS_CONNECTION_READ');
  }

  static forFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature([Product, Promo, ProductsImage], 'READ_CONNECTION');
  }
}
