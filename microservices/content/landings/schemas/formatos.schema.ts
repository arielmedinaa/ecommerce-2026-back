import { Prop, SchemaFactory, Schema } from "@nestjs/mongoose";
import { Types, Document } from "mongoose";

export type FormatoDocument = Formato & Document;

@Schema({ timestamps: true, collection: 'formatos_landing' })
export class Formato {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ required: true, trim: true, unique: true })
    slug: string;

    @Prop({ required: true, trim: true })
    description: string;

    @Prop({ required: true })
    template: string;

    @Prop({ required: true, enum: ['html', 'react', 'jsx'] })
    type: 'html' | 'react' | 'jsx';

    @Prop({ required: true, trim: true })
    category: string;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop({ type: Object })
    preview?: {
        thumbnail?: string;
        screenshot?: string;
        demoUrl?: string;
    };

    @Prop({ type: Object })
    config?: {
        customizableSections?: string[];
        requiredProps?: string[];
        defaultStyles?: Record<string, any>;
        dependencies?: string[];
    };

    @Prop({ type: Object })
    variables?: {
        name: string;
        type: string;
        description: string;
        required: boolean;
        defaultValue?: any;
    }[];

    @Prop({ default: true })
    isActive: boolean;

    @Prop({ default: false })
    isPremium: boolean;

    @Prop({ default: 0 })
    usageCount: number;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    createdBy: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    updatedBy?: Types.ObjectId;

    @Prop({ type: Number, default: 0 })
    sortOrder: number;

    @Prop({ trim: true })
    documentation?: string;

    @Prop({ type: Object })
    metadata?: Record<string, any>;
}

export const FormatoSchema = SchemaFactory.createForClass(Formato);

FormatoSchema.index({ slug: 1 });
FormatoSchema.index({ type: 1 });
FormatoSchema.index({ category: 1 });
FormatoSchema.index({ isActive: 1 });
FormatoSchema.index({ isPremium: 1 });
FormatoSchema.index({ createdBy: 1 });
FormatoSchema.index({ createdAt: -1 });
FormatoSchema.index({ sortOrder: 1 });
FormatoSchema.index({ tags: 1 });