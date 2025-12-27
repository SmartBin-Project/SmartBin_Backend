import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({
    type: String,
    enum: ['ADMIN', 'SUPERADMIN', 'CLEANER'],
    required: true,
  })
  userType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Cleaner', default: null })
  cleanerId: string | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Admin', default: null })
  adminId: string | null;

  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'SuperAdmin',
    default: null,
  })
  superadminId: string | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Bin', required: true })
  binId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Task', required: true })
  taskId: string;

  @Prop({ required: true })
  message: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
