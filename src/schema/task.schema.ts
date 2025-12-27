import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Task extends Document {
  [x: string]: any;
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Bin', required: true })
  binId: string;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Cleaner',
    required: true,
  })
  assignedCleanerId: string;

  @Prop({
    type: String,
    enum: ['PENDING', 'NOTIFIED', 'REJECTED', 'ACCEPTED', 'COMPLETED'],
    default: 'PENDING',
  })
  status: string;

  @Prop()
  notifiedAt?: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  rejectedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop({ default: 0 })
  rejectionCount: number;

  @Prop({ type: String, default: null })
  proofImage: string | null;
}

export const TaskSchema = SchemaFactory.createForClass(Task);
