import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Body,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperadminService } from './superadmin.service';

@Controller('superadmin')
@UseGuards(AuthGuard('jwt'))
export class SuperAdminController {
  constructor(private readonly superadminService: SuperadminService) {}

  @Get('/dashboard')
  async getDashboard() {
    return this.superadminService.getDashboardStats();
  }

  @Get('/admins')
  async getAllAdmins() {
    return this.superadminService.getAllAdmins();
  }

  @Post('/create-admin')
  async createAdmin(@Body() dto: any) {
    return this.superadminService.createAdmin(dto);
  }

  @Patch('/update-admin/:id')
  async updateAdmin(@Param('id') id: string, @Body() dto: any) {
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
  async createCleaner(@Body() dto: any) {
    return this.superadminService.createCleaner(dto);
  }

  @Patch('/update-cleaner/:id')
  async updateCleaner(@Param('id') id: string, @Body() dto: any) {
    return this.superadminService.updateCleaner(id, dto);
  }

  @Delete('/delete-cleaner/:id')
  async deleteCleaner(@Param('id') id: string) {
    return this.superadminService.deleteCleaner(id);
  }
}
