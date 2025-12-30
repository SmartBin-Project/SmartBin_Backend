import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Cleaner extends Document {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, unique: true })
  telegramChatId: string;

  @Prop({ required: true })
  area: string;

  @Prop({ default: 0 })
  acceptCount: number;

  @Prop({ default: 0 })
  rejectCount: number;
}

export const CleanerSchema = SchemaFactory.createForClass(Cleaner);
