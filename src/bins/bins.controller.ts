import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { BinsService } from './bins.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateBinDto } from './dto/create-bin.dto';

@Controller('bins')
export class BinsController {
  constructor(private readonly binsService: BinsService) {}
  // NOTE: We do NOT use @UseGuards('jwt') here because the ESP32
  // usually cannot login. Later, we can add a simple API Key check.
  @Post('update-level')
  updateLevel(@Body() body: { binCode: string; fillLevel: number }) {
    return this.binsService.updateFillLevel(body.binCode, body.fillLevel);
  }

  @Post('update-location')
  updateLocation(@Body() body: { binCode: string; lat: number; lng: number }) {
    return this.binsService.updateLocation(body.binCode, body.lat, body.lng);
  }

  // Public endpoint - no auth required
  @Get('public')
  getPublicBins() {
    return this.binsService.findAllPublic();
  }

  // Everyone (Admins/Cleaners) can SEE the bins
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getAllBins() {
    return this.binsService.findAll();
  }

  @Post('create-bin')
  @UseGuards(AuthGuard('jwt'))
  createBin(@Request() req, @Body() dto: CreateBinDto) {
    if (req.user.role !== 'SUPERADMIN') {
      throw new UnauthorizedException('Only SuperAdmins can create bins');
    }
    return this.binsService.create(dto).then((bin) => ({
      message: 'Bin created successfully',
      data: bin,
    }));
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async updateBin(@Request() req, @Param('id') id: string, @Body() dto: any) {
    if (req.user.role !== 'SUPERADMIN') {
      throw new UnauthorizedException('Only SuperAdmins can update bins');
    }
    const bin = await this.binsService.update(id, dto);
    return {
      message: 'Bin updated successfully',
      data: bin,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Delete(':id')
  async deleteBin(@Request() req, @Param('id') id: string) {
    if (req.user.role !== 'SUPERADMIN') {
      throw new UnauthorizedException('Only SuperAdmins can delete bins');
    }
    const bin = await this.binsService.delete(id);
    return {
      message: 'Bin deleted successfully',
      data: bin,
    };
  }
}
