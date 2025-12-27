import {
  forwardRef,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bin } from 'src/schema/bin.schema';
import { TasksService } from 'src/task/task.service';

@Injectable()
export class BinsService {
  constructor(
    @InjectModel('Bin') private binModel: Model<Bin>,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
  ) {}

  async create(dto: any) {
    if (!dto.location || !dto.location.lat || !dto.location.lng) {
      throw new Error('Location with lat and lng is required');
    }
    const newBin = new this.binModel(dto);
    return newBin.save();
  }

  async findAll() {
    return this.binModel.find().exec();
  }

  async update(id: string, dto: any) {
    return this.binModel.findByIdAndUpdate(id, dto, { new: true });
  }

  async delete(id: string) {
    return this.binModel.findByIdAndDelete(id);
  }

  async clearBinTask(binId: string) {
    return this.binModel.findByIdAndUpdate(binId, { lastTaskId: null });
  }

  // --- HARDWARE UPDATE ---
  async updateFillLevel(binCode: string, fillLevel: number) {
    const bin = await this.binModel.findOne({ binCode });
    if (!bin) throw new NotFoundException('Bin not found');

    bin.fillLevel = fillLevel;

    // Determine Status
    if (fillLevel >= 90) bin.status = 'FULL';
    else if (fillLevel >= 50) bin.status = 'HALF';
    else bin.status = 'EMPTY';

    await bin.save();

    // TRIGGER ALERT if Full
    if (bin.status === 'FULL') {
      // Check if there is already an active task so we don't spam
      // (You would typically check bin.lastTaskId here)
      if (!bin.lastTaskId) {
        const newTask = await this.tasksService.assignTaskToRandomCleaner(
          bin._id.toString(),
          bin.area,
        );
        if (newTask) {
          bin.lastTaskId = newTask._id.toString();
          await bin.save();
        }
      }
    }

    return bin;
  }

  async updateLocation(binCode: string, lat: number, lng: number) {
    const bin = await this.binModel.findOne({ binCode });
    if (!bin) throw new NotFoundException('Bin not found');

    bin.location = { lat, lng };
    return bin.save();
  }
}
