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
    const bins = await this.binModel
      .find()
      .select('_id binCode location area fillLevel status fullCount')
     
      .exec();
    console.log(
      '🔍 findAll result:',
      bins.length > 0 ? JSON.stringify(bins[0]) : 'empty',
    );
    return bins;
  }
  // async findAll() {
  //   return this.binModel.find().exec();
  // }

  async findAllPublic() {
    return this.binModel
      .find()
      .select('binCode location area fillLevel status fullCount')
      .exec();
  }

  async findById(id: string) {
    return this.binModel.findById(id);
  }

  async update(id: string, dto: any) {
    const bin = await this.findById(id);
    if (!bin) {
      throw new NotFoundException(`Bin with ID ${id} not found`);
    }

    const oldStatus = bin.status;
    // Update bin properties from DTO
    Object.assign(bin, dto);

    // If fillLevel is being updated, recalculate status and fullCount
    if (dto.fillLevel !== undefined) {
      if (bin.fillLevel >= 90) {
        bin.status = 'FULL';
      } else if (bin.fillLevel >= 50) {
        bin.status = 'HALF';
      } else {
        bin.status = 'EMPTY';
      }

      // If status changes to FULL, increment fullCount
      if (bin.status === 'FULL' && oldStatus !== 'FULL') {
        bin.fullCount = (bin.fullCount || 0) + 1;
      }
    }

    const result = await bin.save();
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
    const oldStatus = bin.status;
    bin.fillLevel = fillLevel;


    // Determine Status
    if (fillLevel >= 90) bin.status = 'FULL';
    else if (fillLevel >= 50) bin.status = 'HALF';
    else bin.status = 'EMPTY';

    // If status changed to FULL, increment count
    if (bin.status === 'FULL' && oldStatus !== 'FULL') {
      bin.fullCount = (bin.fullCount || 0) + 1;
    }

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
    }

    await bin.save();
    return bin;
  }

  async updateLocation(binCode: string, lat: number, lng: number) {
    const bin = await this.binModel.findOne({ binCode });
    if (!bin) throw new NotFoundException('Bin not found');

    bin.location = { lat, lng };
    return bin.save();
  }

  // Migration: Add area to bins that don't have it
  async migrateAddAreas() {
    const areaMap: { [key: string]: string } = {
      SB1: 'Institute of Technology of Cambodia',
      SMC1: 'Stueng meanchey',
      R1: 'RUPP',
      E1: 'Economica',
    };

    const result = await this.binModel.updateMany(
      { area: { $exists: false } },
      [
        {
          $set: {
            area: {
              $ifNull: [
                '$area',
                {
                  $getField: {
                    input: { $literal: areaMap },
                    field: '$binCode',
                  },
                },
              ],
            },
          },
        },
      ],
    );

    // Fallback: Update any remaining bins without area
    const binsWithoutArea = await this.binModel.find({
      $or: [{ area: null }, { area: { $exists: false } }],
    });
    for (const bin of binsWithoutArea) {
      bin.area = areaMap[bin.binCode] || 'Unknown Area';
      await bin.save();
    }

    this.logger.log(
      `Migration completed. Updated ${result.modifiedCount} bins`,
    );
    return {
      message: 'Migration completed',
      modifiedCount: result.modifiedCount,
      fallbackUpdated: binsWithoutArea.length,
    };
  }
}
