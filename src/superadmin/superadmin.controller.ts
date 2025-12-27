import { Controller, Get, Post, Patch, UseGuards, Body } from '@nestjs/common';
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
  @Post('/create-admin')
  async createAdmin(@Body() dto: any) {
    return this.superadminService.createAdmin(dto);
  }
}
