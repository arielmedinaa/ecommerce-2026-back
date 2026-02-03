import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type PaymentErrorDocument = PaymentError & Document;

@Schema({ timestamps: true, collection: 'logs_transacciones' })
export class PaymentError {
    @Prop({ type: Types.ObjectId, ref: 'Payments', required: true, index: true })
    paymentId: Types.ObjectId;

    @Prop({ required: true })
    errorCode: string;

    @Prop({ required: true })
    message: string;

    @Prop({ type: Object })
    context: Record<string, any>;

    @Prop()
    stackTrace?: string;

    @Prop()
    path?: string;
}

export const PaymentErrorSchema = SchemaFactory.createForClass(PaymentError);
