import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { Admin } from 'src/schema/admin.schema';
import { Bin } from 'src/schema/bin.schema';
import { Task } from 'src/schema/task.schema';
import { Cleaner } from 'src/schema/cleaner.schema';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateCleanerDto } from './dto/create-cleaner.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
@Injectable()
export class SuperadminService {
  constructor(
    @InjectModel('Admin') private adminModel: Model<Admin>,
    @InjectModel('SuperAdmin') private superAdminModel: Model<any>,
    @InjectModel('Bin') private binModel: Model<Bin>,
    @InjectModel('Task') private taskModel: Model<Task>,
    @InjectModel('Cleaner') private cleanerModel: Model<Cleaner>,
  ) {}

  async getProfile(userId: string) {
    let user = await this.adminModel.findById(userId).exec();

    if (!user) {
      user = await this.superAdminModel.findById(userId).exec();
    }

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    let user = await this.adminModel.findById(userId).exec();
    let isAdmin = true;
    if (!user) {
      user = await this.superAdminModel.findById(userId).exec();
      isAdmin = false;
    }

    if (!user) throw new NotFoundException('User not found');
    const updateData = {
      firstName: dto.firstName || user.firstName,
      lastName: dto.lastName || user.lastName,
      gender: dto.gender || user.gender,
      phone: dto.phone || user.phone,
      dateOfBirth: dto.dateOfBirth || user.dateOfBirth,
      address: dto.address || user.address,
      profilePic: dto.profilePic || user.profilePic,
    };

    let updatedUser;
    if (isAdmin) {
      updatedUser = await this.adminModel
        .findByIdAndUpdate(userId, updateData, { new: true })
        .exec();
    } else {
      updatedUser = await this.superAdminModel
        .findByIdAndUpdate(userId, updateData, { new: true })
        .exec();
    }

    return {
      message: 'Profile updated successfully',
      user: updatedUser,
    };
  }

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

  async getAllAdmins() {
    return this.adminModel.find().exec();
  }

  async createAdmin(dto: CreateAdminDto) {
    const { username, email, password, area } = dto;

    const existing = await this.adminModel.findOne({ email });
    if (existing)
      throw new BadRequestException('Admin with this email already exists');

    const hashPassword = await bcrypt.hash(password, 10);

    const newAdmin = new this.adminModel({
      username,
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

  async deleteAdmin(id: string) {
    return {
      message: 'Admin deleted successfully',
      admin: await this.adminModel.findByIdAndDelete(id).exec(),
    };
  }

  async updateAdmin(id: string, dto: UpdateAdminDto) {
    const updateData: any = { ...dto };

    if (dto.password && dto.password.trim()) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    } else {
      delete updateData.password;
    }

    return {
      message: 'Admin updated successfully',
      admin: await this.adminModel
        .findByIdAndUpdate(id, updateData, {
          new: true,
        })
        .exec(),
    };
  }

  async getAllCleaners() {
    return this.cleanerModel.find().exec();
  }

  async createCleaner(dto: CreateCleanerDto) {
    const { name, telegramChatId, area, pictureCleaner } = dto;

    const existing = await this.cleanerModel.findOne({ telegramChatId });
    if (existing)
      throw new BadRequestException(
        'Cleaner with this Telegram ID already exists',
      );

    const newCleaner = new this.cleanerModel({
      name,
      telegramChatId,
      area,
      pictureCleaner: pictureCleaner || [],
    });
    return {
      message: 'Cleaner created successfully',
      cleaner: await newCleaner.save(),
    };
  }

  async deleteCleaner(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid cleaner ID format');
    }

    const cleaner = await this.cleanerModel.findByIdAndDelete(id).exec();

    if (!cleaner) {
      throw new NotFoundException('Cleaner not found');
    }

    return {
      message: 'Cleaner deleted successfully',
      cleaner,
    };
  }

  async updateCleaner(id: string, dto: CreateCleanerDto) {
    return {
      message: 'Cleaner updated successfully',
      cleaner: await this.cleanerModel
        .findByIdAndUpdate(id, dto, {
          new: true,
        })
        .exec(),
    };
  }
}
