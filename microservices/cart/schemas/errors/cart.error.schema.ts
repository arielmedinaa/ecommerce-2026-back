import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type CartErrorDocument = CartError & Document;

@Schema({ timestamps: true, collection: 'logs_carritos' })
export class CartError {
    @Prop({ type: Types.ObjectId, ref: 'Cart', required: true, index: true })
    cartId: Types.ObjectId;

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

export const CartErrorSchema = SchemaFactory.createForClass(CartError);