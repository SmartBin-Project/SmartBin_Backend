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
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { TranslationService } from 'src/common/translation.service';
import { CreateBinDto } from './dto/create-bin.dto';
import { BinsGateway } from './bins.gateway';

@Injectable()
export class BinsService {
  private readonly logger = new Logger(BinsService.name);

  constructor(
    @InjectModel('Bin') private binModel: Model<Bin>,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
    private translationService: TranslationService,
    private binsGateway: BinsGateway,
  ) {
    // Create uploads directory if it doesn't exist
    this.ensureUploadsDirectory();
  }

  private ensureUploadsDirectory() {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'bins');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      this.logger.log(`✅ Created uploads directory: ${uploadsDir}`);
    }
  }

  private async saveBase64Image(base64Data: string): Promise<string> {
    try {
      const base64String = base64Data.replace(/^data:image\/\w+;base64,/, '');

      // Use UUID for guaranteed unique filenames
      const uuid = randomUUID();
      const filename = `bin-${uuid}.png`;

      const uploadsDir = path.join(process.cwd(), 'uploads', 'bins');
      const filePath = path.join(uploadsDir, filename);

      const buffer = Buffer.from(base64String, 'base64');
      fs.writeFileSync(filePath, buffer);

      const sizeInKB = (buffer.length / 1024).toFixed(2);
      this.logger.log(` Saved: ${filename} (${sizeInKB} KB)`);

      // Return relative path for storage in database
      return `/uploads/bins/${filename}`;
    } catch (error) {
      this.logger.error(`❌ Error saving Base64 image: ${error.message}`);
      throw error;
    }
  }

  private async processImages(pictureBins: string[]): Promise<string[]> {
    if (!pictureBins || pictureBins.length === 0) {
      return [];
    }

    this.logger.log(`\n🖼️  Processing ${pictureBins.length} image(s)...`);
    const savedPaths: string[] = [];

    for (let i = 0; i < pictureBins.length; i++) {
      const base64Image = pictureBins[i];
      if (base64Image) {
        try {
          this.logger.log(
            `   [${i + 1}/${pictureBins.length}] Processing image...`,
          );
          const savedPath = await this.saveBase64Image(base64Image);
          savedPaths.push(savedPath);
          this.logger.log(
            `   [${i + 1}/${pictureBins.length}] ✅ Saved to: ${savedPath}`,
          );
        } catch (error) {
          this.logger.warn(
            `   [${i + 1}/${pictureBins.length}] ⚠️  Failed to save image: ${error.message}`,
          );
        }
      }
    }

    if (savedPaths.length > 0) {
      this.logger.log(
        `✅ All images processed: ${savedPaths.length}/${pictureBins.length} saved successfully\n`,
      );
    }
    return savedPaths;
  }

  async create(dto: CreateBinDto) {
    if (!dto.location || !dto.location.lat || !dto.location.lng) {
      throw new Error('Location with lat and lng is required');
    }

    // --- AUTO TRANSLATE LOGIC START ---

    // 1. Auto-translate AREA
    if (dto.area && dto.area.en && !dto.area.kh) {
      this.logger.log(`Auto-translating Area: ${dto.area.en}...`);
      dto.area.kh = await this.translationService.translateText(dto.area.en);
    }

    // 2. Auto-translate ADDRESS
    if (dto.addressBin && dto.addressBin.en && !dto.addressBin.kh) {
      this.logger.log(`Auto-translating Address: ${dto.addressBin.en}...`);
      dto.addressBin.kh = await this.translationService.translateText(
        dto.addressBin.en,
      );
    }

    // --- AUTO TRANSLATE LOGIC END ---

    // --- PROCESS IMAGES START ---
    // Handle image processing: Convert base64 to file paths (same as update)
    if (
      dto.pictureBins &&
      Array.isArray(dto.pictureBins) &&
      dto.pictureBins.length > 0
    ) {
      this.logger.log(
        `\n📷 Processing pictureBins: ${dto.pictureBins.length} image(s) received`,
      );

      // Check if these are base64 strings (new images from frontend)
      const hasBase64 = dto.pictureBins.some((img: string) =>
        img.startsWith('data:image'),
      );

      if (hasBase64) {
        this.logger.log(
          `✅ Detected base64 images - processing ${dto.pictureBins.length} image(s)...`,
        );
        const savedImagePaths = await this.processImages(dto.pictureBins);
        this.logger.log(
          `📁 Saved ${savedImagePaths.length} image(s) successfully`,
        );
        // Replace base64 strings with actual file paths
        dto.pictureBins = savedImagePaths;
      }
    }
    // --- PROCESS IMAGES END ---

    const newBin = new this.binModel(dto);
    return newBin.save();
  }

  async findAll() {
    const bins = await this.binModel
      .find()
      .select(
        '_id binCode location area fillLevel status fullCount pictureBins addressBin',
      )

      .exec();
    return bins;
  }
  // async findAll() {
  //   return this.binModel.find().exec();
  // }

  async findAllPublic() {
    return this.binModel
      .find()
      .select(
        'binCode location area fillLevel status fullCount pictureBins addressBin',
      )
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

    // 1. Handle Area: If 'en' is present but 'kh' is missing, auto-translate
    if (dto.area && dto.area.en && !dto.area.kh) {
      this.logger.log(`[Update] Auto-translating Area: ${dto.area.en}...`);
      dto.area.kh = await this.translationService.translateText(dto.area.en);
    }

    // 2. Handle Address: If 'en' is present but 'kh' is missing, auto-translate
    if (dto.addressBin && dto.addressBin.en && !dto.addressBin.kh) {
      this.logger.log(
        `[Update] Auto-translating Address: ${dto.addressBin.en}...`,
      );
      dto.addressBin.kh = await this.translationService.translateText(
        dto.addressBin.en,
      );
    }

    const oldStatus = bin.status;

    // 3. Handle image updates: ONLY process if pictureBins are provided (new base64 images)
    if (
      dto.pictureBins &&
      Array.isArray(dto.pictureBins) &&
      dto.pictureBins.length > 0
    ) {
      this.logger.log(
        `\n Processing pictureBins update: ${dto.pictureBins.length} image(s) received`,
      );

      // Check if these are base64 strings (new images) or file paths (old images)
      const hasBase64 = dto.pictureBins.some((img: string) =>
        img.startsWith('data:image'),
      );

      if (hasBase64) {
        this.logger.log(
          `Detected base64 images - processing ${dto.pictureBins.length} image(s)...`,
        );
        const savedImagePaths = await this.processImages(dto.pictureBins);
        this.logger.log(
          ` Saved ${savedImagePaths.length} image(s) successfully`,
        );
        if (savedImagePaths.length > 0) {
          dto.pictureBins = savedImagePaths;
          this.logger.log(
            ` Updated pictureBins array with ${savedImagePaths.length} path(s)`,
          );
        } else {
          this.logger.warn(
            `  No images were saved, removing pictureBins from update`,
          );
          delete dto.pictureBins;
        }
      } else {
        // These are already saved file paths from the database, keep them as is
        this.logger.log(
          `Keeping existing ${dto.pictureBins.length} image(s) from database...`,
        );
      }
    } else {
      // No images provided in update - preserve existing images
      if (dto.pictureBins === undefined) {
        this.logger.log(
          `No pictureBins provided in update - preserving existing images`,
        );
      }
      delete dto.pictureBins;
    }

    // Update bin properties from DTO
    Object.assign(bin, dto);

    // Log what's being saved
    if (bin.pictureBins && Array.isArray(bin.pictureBins)) {
      this.logger.log(
        `\n💾 About to save bin with ${bin.pictureBins.length} image(s):`,
      );
      bin.pictureBins.forEach((path, idx) => {
        this.logger.log(`   [${idx + 1}] ${path}`);
      });
    }

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

    // Log what was actually saved
    if (result.pictureBins && Array.isArray(result.pictureBins)) {
      this.logger.log(
        `\n✅ Bin saved successfully with ${result.pictureBins.length} image(s)`,
      );
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

  // --- HARDWARE UPDATE (UPDATED LOGIC) ---
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

    if (bin.status === 'FULL' && oldStatus !== 'FULL') {
      bin.fullCount = (bin.fullCount || 0) + 1;
    }

    await bin.save();

    // 🔥 UPDATED LOGIC START 🔥
    if (bin.status === 'FULL') {
      let shouldCreateTask = true;

      // 1. Check if there is an existing task
      if (bin.lastTaskId) {
        // Fetch the task details
        const existingTask = await this.tasksService.findById(bin.lastTaskId);

        if (existingTask) {
          // A. If task is PENDING (No one accepted yet)
          if (existingTask.status === 'PENDING') {
             this.logger.log(`Task ${existingTask._id} is PENDING. Waiting for cleaner.`);
             shouldCreateTask = false; // Don't spam new tasks
          } 
          // B. If task is ACCEPTED (Cleaner is coming)
          else if (existingTask.status === 'ACCEPTED' || existingTask.status === 'IN_PROGRESS') {
             const now = new Date().getTime();
             const acceptedAt = new Date(existingTask.acceptedAt || existingTask.updatedAt).getTime();
             const minutesSinceAccept = (now - acceptedAt) / (1000 * 60);

             if (minutesSinceAccept < 10) {
                this.logger.log(`⏳ Cleaner accepted ${minutesSinceAccept.toFixed(1)} mins ago. Suppressing Alert.`);
                shouldCreateTask = false; // <--- THIS STOPS THE ALERT
             } else {
                this.logger.warn(`⚠️ Cleaner accepted > 10 mins ago but bin still full! Sending Reminder.`);
                shouldCreateTask = true; // (Optional) Create new task or send reminder
                // Note: If you just want to remind, handle that logic here instead of creating a NEW task
             }
          }
        }
      }

      // 2. Only Create Task if Logic Allows
      if (shouldCreateTask) {
        this.logger.log(`Bin ${binCode} needs attention. Creating/Updating task...`);
        // ... (Your existing task creation logic) ...
        try {
          const newTask = await this.tasksService.assignTaskToRandomCleaner(
            bin._id.toString(),
            bin.area.en,
          );
          if (newTask) {
             bin.lastTaskId = newTask._id.toString();
          }
        } catch (error) {
           this.logger.error(`Error creating task: ${error.message}`);
        }
      }
    }
    // 🔥 UPDATED LOGIC END 🔥

    // AUTO-CLEAR TASK when bin is emptied
    if (bin.status === 'EMPTY' && bin.lastTaskId) {
      this.logger.log(`Bin ${binCode} is now EMPTY. Clearing task.`);
      bin.lastTaskId = null;
    }

    await bin.save();
  
    this.binsGateway.sendBinUpdate({
      binCode: bin.binCode,
      fillLevel: bin.fillLevel,
      status: bin.status,
    });
    return bin;
  }

  async updateLocation(binCode: string, lat: number, lng: number) {
    // 1. Find and Update Database
    const bin = await this.binModel.findOne({ binCode });
    if (!bin) throw new NotFoundException('Bin not found');

    bin.location = { lat, lng };
    await bin.save();

    // 2. 🔥 ADD THIS: Broadcast the new location to Frontend 🔥
    this.binsGateway.sendBinUpdate({
      binCode: bin.binCode,
      location: bin.location, // Send the new lat/lng
      // We don't need to send fillLevel here, just location
    });

    return bin;
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
      const enArea = areaMap[bin.binCode] || 'Unknown Area';
      bin.area = {
        en: enArea,
        kh: await this.translationService.translateText(enArea),
      };
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