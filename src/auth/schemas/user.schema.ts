import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ nullable: true })
  password: string | null;

  @Prop({ nullable: true, name: 'google_id' })
  googleId: string | null;

  @Prop({ nullable: true, name: 'refresh_token' })
  refreshToken: string | null;
}

export const UserSchema = SchemaFactory.createForClass(User);
