import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class SuperAdmin extends Document {
  @Prop({ required: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ default: 'SUPERADMIN' })
  role: string;

  @Prop({ default: null })
  firstName: string;

  @Prop({ default: null })
  lastName: string;

  @Prop({ default: null })
  gender: string;

  @Prop({ default: null })
  phone: string;

  @Prop({ default: null })
  dateOfBirth: string;

  @Prop({ default: null })
  address: string;

  @Prop({ default: null })
  profilePic: string;
}

export const SuperAdminSchema = SchemaFactory.createForClass(SuperAdmin);
