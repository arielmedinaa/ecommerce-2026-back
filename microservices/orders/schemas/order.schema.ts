import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type OrderDocument = Order & Document;

@Schema({ timestamps: true })
export class Order {
  @Prop({ required: true })
  clienteToken: string;

  @Prop({ required: true })
  orderNumber: string;

  @Prop({ required: true, enum: ['contado', 'credito'] })
  orderType: 'contado' | 'credito';

  @Prop({ required: true, enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'] })
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

  @Prop({ type: Object })
  items: any[];

  @Prop({ required: true })
  totalAmount: number;

  @Prop({ type: Object })
  paymentInfo: any;

  @Prop({ type: Object })
  shippingInfo: any;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
