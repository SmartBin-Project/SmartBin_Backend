import {
  Controller,
  Get,
  Post,
  Patch,
  UseGuards,
  Body,
  Delete,
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

  @Get('/cleaners')
  async getAllCleaners() {
    return this.superadminService.getAllCleaners();
  }

  @Post('/create-cleaner')
  async createCleaner(@Body() dto: any) {
    return this.superadminService.createCleaner(dto);
  }

  @Delete('/delete-cleaner/:id')
  async deleteCleaner(@Body() id: string) {
    return this.superadminService.deleteCleaner(id);
  }
}
