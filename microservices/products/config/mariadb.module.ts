import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Category } from '../schemas/category.schemas';
import { Product } from '../schemas/product.schemas';
import { Combo } from '../schemas/combo.schemas';
import { Oferta } from '../schemas/oferta.schemas';
import { ProductoOferta } from '../schemas/producto-oferta.schemas';
import { Promo } from '../schemas/promo.schemas';

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
        entities: [Category, Product, Combo, Oferta, ProductoOferta, Promo],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([Category, Product, Combo, Oferta, ProductoOferta, Promo]),
  ],
  exports: [TypeOrmModule],
})
export class MariaDbModule {}
