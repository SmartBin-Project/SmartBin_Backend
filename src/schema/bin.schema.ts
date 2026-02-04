import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Bin extends Document {
  @Prop({ required: true, unique: true })
  binCode: string;

  @Prop({
    type: {
      en: String,
      kh: String,
    },
    required: true,
  })
  area: {
    en: string;
    kh: string;
  };

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
    enum: ['EMPTY', 'HALF', 'NEARLY FULL', 'FULL'],
    default: 'EMPTY',
  })
  status: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Task', default: null })
  lastTaskId: string | null;

  @Prop({ default: 0 })
  fullCount: number;

  @Prop({ type: [String], default: null })
  pictureBins: string[];

  @Prop({
    type: {
      en: String,
      kh: String,
    },
    required: true,
  })
  addressBin: {
    en: string;
    kh: string;
  };
}

export const BinSchema = SchemaFactory.createForClass(Bin);
