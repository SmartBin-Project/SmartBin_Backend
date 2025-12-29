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

  //   --- Get All Admin Users
  async getAllAdmins() {
    return this.adminModel.find().exec();
  }

  //   --- Create Admin User
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

  //   --- Delete Admin User
  async deleteAdmin(id: string) {
    return this.adminModel.findByIdAndDelete(id).exec();
  }

  //   --- Update Admin User
  async updateAdmin(id: string, dto: any) {
    return this.adminModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  //  --- Get All Cleaner Users
  async getAllCleaners() {
    return this.cleanerModel.find().exec();
  }

  // --- Create Cleaner User
  async createCleaner(dto: any) {
    const { name, telegramChatId, area } = dto;

    const existing = await this.cleanerModel.findOne({ telegramChatId });
    if (existing)
      throw new BadRequestException(
        'Cleaner with this Telegram ID already exists',
      );

    const newCleaner = new this.cleanerModel({
      name,
      telegramChatId,
      area,
      role: 'CLEANER',
    });
    return {
      message: 'Cleaner created successfully',
      cleaner: await newCleaner.save(),
    };
  }

  //   --- Delete Cleaner User
  async deleteCleaner(id: string) {
    return this.cleanerModel.findByIdAndDelete(id).exec();
  }

  //   --- Update Cleaner User
  async updateCleaner(id: string, dto: any) {
    return this.cleanerModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }
}
