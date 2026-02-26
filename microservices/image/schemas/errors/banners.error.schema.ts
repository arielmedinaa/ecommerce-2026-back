import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type BannerErrorDocument = BannerError & Document;

@Schema({ timestamps: true, collection: 'logs_banners' })
export class BannerError {
    @Prop({ type: Types.ObjectId, ref: 'Banner', required: true, index: true })
    bannerId: Types.ObjectId;

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

    @Prop()
    operation?: string;

    @Prop()
    userId?: string;

    @Prop()
    fileName?: string;

    @Prop()
    device?: string;
}

export const BannerErrorSchema = SchemaFactory.createForClass(BannerError);