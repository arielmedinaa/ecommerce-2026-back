import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type LandingDocument = Landing & Document;

@Schema({ timestamps: true, collection: 'landings' })
export class Landing {
    @Prop({ required: true, trim: true })
    title: string;

    @Prop({ required: true, trim: true })
    slug: string;

    @Prop({ required: true })
    content: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
    createdBy: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    updatedBy?: Types.ObjectId;

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isPublished: boolean;

    @Prop({ trim: true })
    description?: string;

    @Prop({ trim: true })
    metaTitle?: string;

    @Prop({ trim: true })
    metaDescription?: string;

    @Prop({ trim: true })
    metaKeywords?: string;

    @Prop({ default: 0 })
    viewCount: number;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop({ type: Object })
    customStyles?: Record<string, any>;

    @Prop({ type: Object })
    customScripts?: Record<string, any>;

    @Prop({ type: Date })
    publishedAt?: Date;

    @Prop({ type: Date })
    expiresAt?: Date;
}

export const LandingSchema = SchemaFactory.createForClass(Landing);

LandingSchema.index({ slug: 1 });
LandingSchema.index({ createdBy: 1 });
LandingSchema.index({ isActive: 1 });
LandingSchema.index({ isPublished: 1 });
LandingSchema.index({ createdAt: -1 });
LandingSchema.index({ updatedAt: -1 });
LandingSchema.index({ tags: 1 });