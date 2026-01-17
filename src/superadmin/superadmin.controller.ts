import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Body,
  Delete,
  Param,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminService } from './superadmin.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { CreateCleanerDto } from './dto/create-cleaner.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';

@Controller('superadmin')
@UseGuards(AuthGuard('jwt'))
export class SuperAdminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('/profile')
  async getProfile(@Request() req) {
    return this.superadminService.getProfile(req.user.userId);
  }

  @Patch('/profile')
  async updateProfile(@Request() req, @Body() dto: UpdateProfileDto) {
    return this.superadminService.updateProfile(req.user.userId, dto);
  }

  @Get('/dashboard')
  async getDashboard() {
    return this.superadminService.getDashboardStats();
  }

  @Get('/admins')
  async getAllAdmins() {
    return this.superadminService.getAllAdmins();
  }

  @Post('/create-admin')
  async createAdmin(@Body() dto: CreateAdminDto) {
    return this.superadminService.createAdmin(dto);
  }

  @Patch('/update-admin/:id')
  async updateAdmin(@Param('id') id: string, @Body() dto: UpdateAdminDto) {
    return this.superadminService.updateAdmin(id, dto);
  }

  @Delete('/delete-admin/:id')
  async deleteAdmin(@Param('id') id: string) {
    return this.superadminService.deleteAdmin(id);
  }

  @Get('/cleaners')
  async getAllCleaners() {
    return this.superadminService.getAllCleaners();
  }

  @Post('/create-cleaner')
  async createCleaner(@Body() dto: CreateCleanerDto) {
    return this.superadminService.createCleaner(dto);
  }

  @Patch('/update-cleaner/:id')
  async updateCleaner(@Param('id') id: string, @Body() dto: CreateCleanerDto) {
    return this.superadminService.updateCleaner(id, dto);
  }

  @Delete('/delete-cleaner/:id')
  async deleteCleaner(@Param('id') id: string) {
    return this.superadminService.deleteCleaner(id);
  }
}
