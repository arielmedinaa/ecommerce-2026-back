import { Module, DynamicModule, Logger, ServiceUnavailableException } from '@nestjs/common';
import { TypeOrmModule, getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
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

@Module({})
export class MariaDbModule {
  private static createErpDataSourceProvider(connectionName: string) {
    return {
      provide: getDataSourceToken(connectionName),
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger(`ErpDataSource:${connectionName}`);
        const isRead = connectionName === 'READ_CONNECTION';
        const host = isRead
          ? configService.get<string>('ECONT_DB_READ_HOST') ||
            configService.get<string>('ECONT_DB_HOST')
          : configService.get<string>('ECONT_DB_HOST');
        const port = isRead
          ? configService.get<number>(
              'ECONT_DB_READ_PORT',
              configService.get<number>('ECONT_DB_PORT', 3306),
            )
          : configService.get<number>('ECONT_DB_PORT', 3306);
        const dataSource = new DataSource({
          type: 'mysql',
          host,
          port,
          username: configService.get<string>('ECONT_DB_USER'),
          password: configService.get<string>('ECONT_DB_PASSWORD'),
          database: configService.get<string>('ECONT_DB_DATABASE'),
          entities: [Product, Promo, Oferta, ProductoOferta, ProductsImage],
          synchronize: false,
          logging: false,
          extra: {
            connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
            connectionLimit: Number(
              process.env[`DB_POOL_SIZE_${connectionName}`] || 10,
            ),
          },
        });

        const tryConnect = async () => {
          if (dataSource.isInitialized) return;
          try {
            await dataSource.initialize();
            logger.log(`Conectado al ERP (${connectionName})`);
          } catch (error) {
            logger.error(`ERP no disponible para ${connectionName}: ${error.message}`);
          }
        };

        await tryConnect();
        if (!dataSource.isInitialized) {
          const retryDelay = Number(process.env.DB_RETRY_DELAY_MS || 3000) * 10;
          setInterval(tryConnect, retryDelay);
        }

        return dataSource;
      },
      inject: [ConfigService],
    };
  }

  private static createErpRepositoryProvider(entity: Function, connectionName: string) {
    return {
      provide: getRepositoryToken(entity, connectionName),
      useFactory: (dataSource: DataSource) => {
        const nonCallableProps = new Set([
          'then',
          'onModuleInit',
          'onModuleDestroy',
          'onApplicationBootstrap',
          'beforeApplicationShutdown',
          'onApplicationShutdown',
        ]);
        return new Proxy(
          {},
          {
            get(_target, prop) {
              if (!dataSource.isInitialized) {
                if (typeof prop === 'symbol' || nonCallableProps.has(prop as string)) {
                  return undefined;
                }
                return (..._args: any[]) => {
                  throw new ServiceUnavailableException(
                    `ERP no disponible: no se pudo acceder a ${entity.name} (${connectionName})`,
                  );
                };
              }
              const repo: any = dataSource.getRepository(entity);
              const value = repo[prop];
              return typeof value === 'function' ? value.bind(repo) : value;
            },
          },
        );
      },
      inject: [getDataSourceToken(connectionName)],
    };
  }

  static forWrite(): DynamicModule {
    const provider = MariaDbModule.createErpDataSourceProvider('WRITE_CONNECTION');
    return {
      global: true,
      module: MariaDbModule,
      imports: [ConfigModule],
      providers: [provider],
      exports: [provider.provide],
    };
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
          connectionLimit: Number(process.env.DB_POOL_SIZE_WRITE_ECOMMERCE_PRODUCTS || 5),
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
          connectionLimit: Number(process.env.DB_POOL_SIZE_READ_ECOMMERCE_PRODUCTS || 5),
        },
      }),
      inject: [ConfigService],
    });
  }

  static forRead(): DynamicModule {
    const provider = MariaDbModule.createErpDataSourceProvider('READ_CONNECTION');
    return {
      global: true,
      module: MariaDbModule,
      imports: [ConfigModule],
      providers: [provider],
      exports: [provider.provide],
    };
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
          connectionLimit: Number(process.env.DB_POOL_SIZE_OFERTAS || 5),
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
          connectionLimit: Number(process.env.DB_POOL_SIZE_OFERTAS_READ || 5),
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
          connectionLimit: Number(process.env.DB_POOL_SIZE_COMBOS || 5),
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
          connectionLimit: Number(process.env.DB_POOL_SIZE_COMBOS_READ || 5),
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
    const providers = [Product, Promo, ProductsImage].map((entity) =>
      MariaDbModule.createErpRepositoryProvider(entity, 'WRITE_CONNECTION'),
    );
    return {
      module: MariaDbModule,
      providers,
      exports: providers.map((p) => p.provide),
    };
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
    const providers = [Product, Promo, ProductsImage].map((entity) =>
      MariaDbModule.createErpRepositoryProvider(entity, 'READ_CONNECTION'),
    );
    return {
      module: MariaDbModule,
      providers,
      exports: providers.map((p) => p.provide),
    };
  }
}
