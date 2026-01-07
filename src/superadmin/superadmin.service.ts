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
@Injectable()
export class SuperadminService {
  constructor(
    @InjectModel('Admin') private adminModel: Model<Admin>,
    @InjectModel('SuperAdmin') private superAdminModel: Model<any>,
    @InjectModel('Bin') private binModel: Model<Bin>,
    @InjectModel('Task') private taskModel: Model<Task>,
    @InjectModel('Cleaner') private cleanerModel: Model<Cleaner>,
  ) {}

  // --- Get User Profile
  async getProfile(userId: string) {
    // Try to find in Admin first
    let user = await this.adminModel.findById(userId).exec();

    // If not found in Admin, try SuperAdmin
    if (!user) {
      user = await this.superAdminModel.findById(userId).exec();
    }

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // --- Update User Profile
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    // Try to find in Admin first
    let user = await this.adminModel.findById(userId).exec();
    let isAdmin = true;

    // If not found in Admin, try SuperAdmin
    if (!user) {
      user = await this.superAdminModel.findById(userId).exec();
      isAdmin = false;
    }

    if (!user) throw new NotFoundException('User not found');

    // Only update allowed profile fields (not password, email, or role)
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

  // --- Dashboard Stats
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

  //   --- Delete Admin User
  async deleteAdmin(id: string) {
    return {
      message: 'Admin deleted successfully',
      admin: await this.adminModel.findByIdAndDelete(id).exec(),
    };
  }

  //   --- Update Admin User
  async updateAdmin(id: string, dto: CreateAdminDto) {
    return {
      message: 'Admin updated successfully',
      admin: await this.adminModel
        .findByIdAndUpdate(id, dto, {
          new: true,
        })
        .exec(),
    };
  }

  //  --- Get All Cleaner Users
  async getAllCleaners() {
    return this.cleanerModel.find().exec();
  }

  // --- Create Cleaner User
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

  //   --- Delete Cleaner User
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

  //   --- Update Cleaner User
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
