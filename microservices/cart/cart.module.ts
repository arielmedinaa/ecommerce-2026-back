// src/services/cart/cart.module.ts
import { Module } from '@nestjs/common';
import { DatabaseModule } from '@shared/config/database/database.module';
import { Cart, CartSchema } from './schemas/cart.schema'
import { MongooseModule } from "@nestjs/mongoose";
import { Llave, LlaveSchema } from './schemas/llave.schema';
import { Transaccion, TransaccionSchema } from './schemas/transaccion.schema';
import { CartContadoService } from './compra/service/cart.service';
import { CartController } from "./compra/controller/cart.controller";
import { CommonModule } from '../../api-gateway/src/common/common.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Llave.name, schema: LlaveSchema },
      { name: Transaccion.name, schema: TransaccionSchema },
    ]),
    DatabaseModule.forRoot(),
    CommonModule,
  ],
  controllers: [CartController],
  providers: [CartContadoService],
  exports: [CartContadoService],
})
export class CartModule {}