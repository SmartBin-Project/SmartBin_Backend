import {
  forwardRef,
  Injectable,
  Inject,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Bin } from 'src/schema/bin.schema';
import { TasksService } from 'src/task/task.service';

@Injectable()
export class BinsService {
  private readonly logger = new Logger(BinsService.name);

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

  async findAllPublic() {
    return this.binModel
      .find()
      .select('binCode location fillLevel status')
      .exec();
  }

  async findById(id: string) {
    return this.binModel.findById(id);
  }

  async update(id: string, dto: any) {
    const result = await this.binModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!result) {
      throw new NotFoundException(`Bin with ID ${id} not found`);
    }
    return result;
  }

  async delete(id: string) {
    const result = await this.binModel.findByIdAndDelete(id);
    if (!result) {
      throw new NotFoundException(`Bin with ID ${id} not found`);
    }
    return result;
  }

  async clearBinTask(binId: string) {
    return this.binModel.findByIdAndUpdate(binId, { lastTaskId: null });
  }

  // --- HARDWARE UPDATE ---
  async updateFillLevel(binCode: string, fillLevel: number) {
    const bin = await this.binModel.findOne({ binCode });
    if (!bin) throw new NotFoundException('Bin not found');

    this.logger.log(`Updating bin ${binCode}: fillLevel = ${fillLevel}`);
    bin.fillLevel = fillLevel;

    // Determine Status
    if (fillLevel >= 90) bin.status = 'FULL';
    else if (fillLevel >= 50) bin.status = 'HALF';
    else bin.status = 'EMPTY';

    await bin.save();

    // TRIGGER ALERT if Full
    if (bin.status === 'FULL') {
      this.logger.log(`Bin ${binCode} is FULL. Creating task...`);
      // Check if there is already an active task so we don't spam
      if (!bin.lastTaskId) {
        try {
          const newTask = await this.tasksService.assignTaskToRandomCleaner(
            bin._id.toString(),
            bin.area,
          );
          if (newTask) {
            this.logger.log(`Task created: ${newTask._id}`);
            bin.lastTaskId = newTask._id.toString();
            await bin.save();
          } else {
            this.logger.warn(`No task created for bin ${binCode}`);
          }
        } catch (error) {
          this.logger.error(`Error creating task for bin ${binCode}:`, error);
        }
      } else {
        this.logger.log(`Bin ${binCode} already has an active task. Skipping.`);
      }
    }

    // AUTO-CLEAR TASK when bin is emptied
    if (bin.status === 'EMPTY' && bin.lastTaskId) {
      this.logger.log(
        `Bin ${binCode} is now EMPTY. Clearing active task ${bin.lastTaskId}`,
      );
      bin.lastTaskId = null;
      await bin.save();
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
