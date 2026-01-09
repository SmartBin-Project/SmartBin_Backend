import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { AdminsService } from './admins.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('admins')
@UseGuards(JwtAuthGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createAdminDto: CreateAdminDto) {
    const admin = await this.adminsService.create(createAdminDto);
    return {
      statusCode: HttpStatus.CREATED,
      message: 'Admin created successfully',
      data: admin,
    };
  }

  @Get()
  async findAll() {
    const admins = await this.adminsService.findAll();
    return {
      statusCode: HttpStatus.OK,
      message: 'Admins retrieved successfully',
      data: admins,
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const admin = await this.adminsService.findOne(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Admin retrieved successfully',
      data: admin,
    };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateAdminDto: UpdateAdminDto) {
    const admin = await this.adminsService.update(id, updateAdminDto);
    return {
      statusCode: HttpStatus.OK,
      message: 'Admin updated successfully',
      data: admin,
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    await this.adminsService.remove(id);
    return {
      statusCode: HttpStatus.OK,
      message: 'Admin deleted successfully',
    };
  }
}
