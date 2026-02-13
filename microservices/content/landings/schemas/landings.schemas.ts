import { Prop, SchemaFactory, Schema } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type LandingDocument = Landing & Document;

@Schema({ timestamps: true, collection: 'landings' })
export class Landing {
  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ required: true, trim: true })
  slug: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: String, required: true, index: true })
  createdBy: string;

  @Prop({ type: String })
  updatedBy?: string;

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

  @Prop({ type: [String], default: [] })
  metaKeywords?: string[];

  @Prop({ default: 0 })
  viewCount: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop({ type: Object })
  customStyles?: Record<string, any>;

  @Prop({ type: Object })
  customScripts?: Record<string, any>;

  @Prop({ type: Date })
  publicadoEn?: Date;

  @Prop({ type: Date })
  expiraEn?: Date;

  @Prop({ type: String })
  tituloRelacionado: string;
}

export const LandingSchema = SchemaFactory.createForClass(Landing);

LandingSchema.index({ title: 1 }, { unique: true, name: 'title_unique' });
LandingSchema.index({ slug: 1 }, { unique: true, name: 'slug_unique' });

LandingSchema.index({ createdBy: 1 });
LandingSchema.index({ isActive: 1 });
LandingSchema.index({ isPublished: 1 });
LandingSchema.index({ createdAt: -1 });
LandingSchema.index({ updatedAt: -1 });
LandingSchema.index({ tags: 1 });
LandingSchema.index({ publishedAt: -1 });
