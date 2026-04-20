import { Module, DynamicModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Product } from '../schemas/product.schemas';
import { Combo } from '../schemas/combo.schemas';
import { Promo } from '../schemas/promo.schemas';
import { Oferta } from '../schemas/oferta.schemas';
import { ProductoOferta } from '../schemas/producto-oferta.schemas';

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
        entities: [Product, Combo, Promo, Oferta, ProductoOferta],
        synchronize: false,
        logging: false,
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
        entities: [Product, Combo, Promo, Oferta, ProductoOferta],
        synchronize: false,
        logging: false,
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
        synchronize: true,
        logging: false,
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
        synchronize: true,
        logging: false,
      }),
      inject: [ConfigService],
    });
  }

  static forFeature(): DynamicModule {
    return TypeOrmModule.forFeature([Product, Combo, Promo], 'WRITE_CONNECTION');
  }
  
  static forOfertasFeature(): DynamicModule {
    return TypeOrmModule.forFeature([Oferta, ProductoOferta], 'OFERTAS_CONNECTION');
  }
  
  static forOfertasFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature([Oferta, ProductoOferta], 'OFERTAS_CONNECTION_READ');
  }

  static forFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature([Product, Combo, Promo], 'READ_CONNECTION');
  }
}
