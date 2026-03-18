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

  static forFeature(): DynamicModule {
    return TypeOrmModule.forFeature([Product, Combo, Promo, Oferta, ProductoOferta], 'WRITE_CONNECTION');
  }

  static forFeatureRead(): DynamicModule {
    return TypeOrmModule.forFeature([Product, Combo, Promo, Oferta, ProductoOferta], 'READ_CONNECTION');
  }
}
