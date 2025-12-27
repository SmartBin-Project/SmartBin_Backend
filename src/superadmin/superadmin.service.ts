import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin } from 'src/schema/admin.schema';
import { Bin } from 'src/schema/bin.schema';
import { Task } from 'src/schema/task.schema';
import { Cleaner } from 'src/schema/cleaner.schema';
@Injectable()
export class SuperadminService {
  constructor(
    @InjectModel('Admin') private adminModel: Model<Admin>,
    @InjectModel('Bin') private binModel: Model<Bin>,
    @InjectModel('Task') private taskModel: Model<Task>,
    @InjectModel('Cleaner') private cleanerModel: Model<Cleaner>,
  ) {}

  // --- 1. Dashboard Stats
  async getDashboardStats() {
    const totalBins = await this.binModel.countDocuments();
    const fullBins = await this.binModel.countDocuments({ status: 'FULL' });
    const activeTasks = await this.taskModel.countDocuments({
      status: 'PENDING',
    });
    const totalCleaners = await this.cleanerModel.countDocuments();
    const totalAdmins = await this.adminModel.countDocuments();

    return {
      overview: {
        totalBins,
        fullBins,
        activeTasks,
        totalCleaners,
        totalAdmins,
      },
    };
  }

  //   --- 2. Create Admin User
  async createAdmin(dto: any) {
    const { name, email, password, area } = dto;

    const existing = await this.adminModel.findOne({ email });
    if (existing)
      throw new BadRequestException('Admin with this email already exists');

    const hashPassword = await bcrypt.hash(password, 10);

    const newAdmin = new this.adminModel({
      name,
      email,
      password: hashPassword,
      area,
      role: 'ADMIN',
    });
    return {
      message: 'Admin created successfully',
      admin: await newAdmin.save(),
    };
  }
}
