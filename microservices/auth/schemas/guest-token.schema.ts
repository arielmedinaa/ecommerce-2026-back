import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';

@Schema({ timestamps: true })
export class GuestToken {
  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  ipAddress: string;

  @Prop({ required: true })
  userAgent: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: Date.now, expires: '30d' })
  expiresAt: Date;

  @Prop({ default: Date.now })
  lastUsedAt: Date;
}

export const GuestTokenSchema = SchemaFactory.createForClass(GuestToken);
