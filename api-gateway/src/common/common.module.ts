import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ObtenerClaveService } from '../../../microservices/cart/common/utils/obtenerClave';
import { Llave, LlaveSchema } from '../../../microservices/cart/schemas/llave.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Llave.name, schema: LlaveSchema }]),
  ],
  providers: [ObtenerClaveService],
  exports: [ObtenerClaveService],
})
export class CommonModule {}
