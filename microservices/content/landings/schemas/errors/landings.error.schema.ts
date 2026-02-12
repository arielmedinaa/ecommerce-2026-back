import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type LandingErrorDocument = LandingError & Document;

@Schema({ timestamps: true, collection: 'logs_landings' })
export class LandingError {
    @Prop({ type: Types.ObjectId, ref: 'Landing', required: true, index: true })
    landingId: Types.ObjectId;

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

    @Prop({ type: Types.ObjectId, ref: 'User' })
    userId?: Types.ObjectId;

    @Prop({ trim: true })
    operation?: string;

    @Prop({ type: Object })
    requestPayload?: Record<string, any>;
}

export const LandingErrorSchema = SchemaFactory.createForClass(LandingError);

// Índices para mejor rendimiento en consultas de errores
LandingErrorSchema.index({ landingId: 1 });
LandingErrorSchema.index({ errorCode: 1 });
LandingErrorSchema.index({ createdAt: -1 });
LandingErrorSchema.index({ userId: 1 });
LandingErrorSchema.index({ operation: 1 });