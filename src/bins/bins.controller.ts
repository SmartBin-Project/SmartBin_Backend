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
  Logger,
} from '@nestjs/common';
import { BinsService } from './bins.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateBinDto } from './dto/create-bin.dto';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller('bins')
export class BinsController {
  private readonly logger = new Logger(BinsController.name);
  constructor(private readonly binsService: BinsService) {}
  // NOTE: We do NOT use @UseGuards('jwt') here because the ESP32
  // usually cannot login. Later, we can add a simple API Key check.
  @Patch('update-level')
  updateLevel(@Body() body: { binCode: string; fillLevel: number }) {
    return this.binsService.updateFillLevel(body.binCode, body.fillLevel);
  }

  @Post('update-location')
  updateLocation(@Body() body: { binCode: string; lat: number; lng: number }) {
    return this.binsService.updateLocation(body.binCode, body.lat, body.lng);
  }

  // 2. Add the MQTT Handlers
  @MessagePattern('bin/update-level')
  async handleMqttUpdate(
    @Payload() data: { binCode: string; fillLevel: number },
  ) {
    this.logger.log(
      `MQTT Received: Bin ${data.binCode} Level ${data.fillLevel}`,
    );

    // Reuse your existing service logic
    return this.binsService.updateFillLevel(data.binCode, data.fillLevel);
  }
  @MessagePattern('bin/update-location')
  async handleMqttLocation(
    @Payload() data: { binCode: string; lat: number; lng: number },
  ) {
    this.logger.log(
      `MQTT Location: ${data.binCode} [${data.lat}, ${data.lng}]`,
    );
    return this.binsService.updateLocation(data.binCode, data.lat, data.lng);
  }

  // Migration endpoint - add area to existing bins without it
  @Post('migrate-add-areas')
  async migrateAddAreas() {
    return this.binsService.migrateAddAreas();
  }

  // Public endpoint - no auth required
  @Get('public')
  async getPublicBins() {
    const bins = await this.binsService.findAllPublic();
    return bins;
  }

  // Everyone (Admins/Cleaners) can SEE the bins
  @UseGuards(AuthGuard('jwt'))
  @Get()
  getAllBins() {
    return this.binsService.findAll();
  }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  async createBin(@Request() req, @Body() dto: CreateBinDto) {
    try {
      // Log only relevant metadata, NOT the full DTO with base64 images
      console.log(
        ` Creating bin: ${dto.binCode} with ${dto.pictureBins?.length || 0} image(s)`,
      );
      if (req.user.role !== 'SUPERADMIN') {
        throw new UnauthorizedException('Only SuperAdmins can create bins');
      }
      const result = await this.binsService.create(dto);
      console.log(` Bin created successfully: ${result._id}`);
      return {
        message: 'Bin created successfully',
        data: result,
      };
    } catch (error) {
      console.error(`Error creating bin ${dto?.binCode}:`, error.message);
      throw error;
    }
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  async updateBin(@Request() req, @Param('id') id: string, @Body() dto: any) {
    if (req.user.role !== 'SUPERADMIN') {
      throw new UnauthorizedException('Only SuperAdmins can update bins');
    }
    // Log only image count and size, not the base64 data
    if (
      dto.pictureBins &&
      Array.isArray(dto.pictureBins) &&
      dto.pictureBins.length > 0
    ) {
      const imageCount = dto.pictureBins.length;
      const totalSizeKB = dto.pictureBins
        .reduce((sum: number, img: string) => sum + img.length / 1024, 0)
        .toFixed(2);
      console.log(
        `s Updating bin with ${imageCount} image(s) | Total size: ${totalSizeKB} KB`,
      );
    }
    const bin = await this.binsService.update(id, dto);
    console.log(`Bin updated successfully: ${id}`);
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
