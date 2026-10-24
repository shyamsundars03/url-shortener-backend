import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UrlDocument = Url & Document;

@Schema({ timestamps: true })
export class Url {
  @Prop({ required: true, unique: true })
  shortUrl: string;

  @Prop({ required: true })
  originalUrl: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ default: [] })
  lastVisited: string[];
}

export const UrlSchema = SchemaFactory.createForClass(Url);
