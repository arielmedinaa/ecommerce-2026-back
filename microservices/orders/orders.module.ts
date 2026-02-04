import { Module } from '@nestjs/common';
import { DatabaseModule } from '@shared/config/database/database.module';
import { MongooseModule } from "@nestjs/mongoose";
import { Order, OrderSchema } from './schemas/order.schema';
import { OrdersService } from './service/orders.service';
import { OrdersController } from "./controller/orders.controller";
import { CommonModule } from '@gateway/common/common.module';
import { JwtModule } from '@nestjs/jwt';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
    ]),
    MicroserviceModule.forRoot([
      'PRODUCTS_SERVICE',
      'PAYMENTS_SERVICE',
      'CART_SERVICE',
      'AUTH_SERVICE',
    ]),
    DatabaseModule.forRoot(),
    CommonModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
