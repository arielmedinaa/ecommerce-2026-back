
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@shared/config/database/database.module';
import { Cart, CartSchema } from '@cart/schemas/cart.schema'
import { MongooseModule } from "@nestjs/mongoose";
import { Llave, LlaveSchema } from '@cart/schemas/llave.schema';
import { Transaccion, TransaccionSchema } from '@cart/schemas/transaccion.schema';
import { CartContadoService } from './service/cart.service';
import { CartController } from "@cart/controller/cart.controller";
import { CommonModule } from '@gateway/common/common.module';
import { JwtModule } from '@nestjs/jwt';
import { HttpModule } from '@nestjs/axios';
import { MicroserviceModule } from '@shared/config/microservice/microservice.module';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1d' },
    }),
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Llave.name, schema: LlaveSchema },
      { name: Transaccion.name, schema: TransaccionSchema },
    ]),
    MicroserviceModule.forRoot([
      'PRODUCTS_SERVICE',
    ]),
    DatabaseModule.forRoot(),
    CommonModule,
    HttpModule,
  ],
  controllers: [CartController],
  providers: [CartContadoService],
  exports: [CartContadoService],
})
export class CartModule {}