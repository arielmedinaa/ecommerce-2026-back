import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsController } from './controller/products.controller';
import { ProductsService } from './service/products/products.service';
import { ProductsImagesService } from './service/products/products-images.service';
import { PromosService } from './service/promos/promos.service';
import { OfertasService } from './service/ofertas/ofertas.service';
import { CombosService } from './service/combos/combos.service';
import { ProductsSellersService } from './service/products-seller/products-sellers.service';
import { ProductsSellerAiApprovalService } from './service/products-seller/products-seller-ai-approval.service';
import { ProductsSellerMongoService } from './service/products-seller/products-seller-mongo.service';
import { SellerCatalogService } from './service/products-seller/seller-catalog.service';
import { NotificationsService } from './service/notifications/notifications.service';
import { PushNotificationService } from './service/notifications/push-notification.service';
import { OfertasValidationService } from './service/errors/ofertas.spec';
import { PromosValidationService } from './service/errors/promos.spec';
import { MariaDbModule } from './config/mariadb.module';
import { ProductsUtils } from './utils/utils-products';
import { ProductsSellersUtils } from './utils/utils-products-sellers';
import { SellerImageValidatorUtil } from './utils/seller-image-validator.util';
import { PromoPricingUtil } from './utils/promo-pricing.util';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { ClaudeClientService } from '@shared/common/services/claude-client.service';
import { RedisModule } from '@shared/common/cache/redis.module';
import { DatabaseModule } from '@shared/config/database/database.module';
import { ProductoMongo, ProductoMongoSchema } from './schemas/products-seller/products-mongo.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.PROVIDER_API_JWT_SECRET || process.env.JWT_SECRET || 'provider-api-secret',
    }),
    RedisModule,
    MicroserviceModule.register('PRODUCTS_SERVICE'),
    MicroserviceModule.forRoot([
      'CART_SERVICE',
    ]),
    MariaDbModule.forWrite(),
    MariaDbModule.forWriteEcommerceProducts(),
    MariaDbModule.forReadEcommerceProducts(),
    MariaDbModule.forRead(),
    MariaDbModule.forFeature(),
    MariaDbModule.forFeatureRead(),
    MariaDbModule.forEcommerceProductsFeature(),
    MariaDbModule.forEcommerceProductsFeatureRead(),
    MariaDbModule.forOfertasWrite(),
    MariaDbModule.forOfertasRead(),
    MariaDbModule.forOfertasFeature(),
    MariaDbModule.forOfertasFeatureRead(),
    MariaDbModule.forCombosWrite(),
    MariaDbModule.forCombosRead(),
    MariaDbModule.forCombosFeature(),
    MariaDbModule.forCombosFeatureRead(),
    DatabaseModule.forRoot(),
    MongooseModule.forFeature([{ name: ProductoMongo.name, schema: ProductoMongoSchema }]),
  ],
  controllers: [ProductsController],
  providers: [
    ProductsService,
    ProductsImagesService,
    PromosService,
    OfertasService,
    CombosService,
    ProductsSellersService,
    ProductsSellerAiApprovalService,
    ProductsSellerMongoService,
    ClaudeClientService,
    SellerCatalogService,
    NotificationsService,
    PushNotificationService,
    OfertasValidationService,
    PromosValidationService,
    ProductsUtils,
    ProductsSellersUtils,
    SellerImageValidatorUtil,
    PromoPricingUtil,
    ResilientService,
    ImageStorageService,
  ],
  exports: [ProductsService, ProductsImagesService, PromosService, OfertasService, CombosService, ProductsSellersService, SellerCatalogService, NotificationsService],
})
export class ProductsModule { }
