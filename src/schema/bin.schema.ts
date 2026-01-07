import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Bin extends Document {
  @Prop({ required: true, unique: true })
  binCode: string;

  @Prop({ required: true })
  area: string;

  @Prop({
    type: {
      lat: Number,
      lng: Number,
    },
    required: true,
  })
  location: {
    lat: number;
    lng: number;
  };

  @Prop({ default: 0 })
  fillLevel: number; // 0–100%

  @Prop({
    type: String,
    enum: ['EMPTY', 'HALF', 'FULL'],
    default: 'EMPTY',
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Task', default: null })
  lastTaskId: string | null;

  @Prop({ default: 0 })
  fullCount: number;

  @Prop({ type: [String], default: null })
  pictureBins: string[];
}

export const BinSchema = SchemaFactory.createForClass(Bin);
