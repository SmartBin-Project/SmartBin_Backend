import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cleaner } from 'src/schema/cleaner.schema';
@Injectable()
export class CleanerService {
  constructor(
    @InjectModel('Cleaner') private readonly cleanerModel: Model<any>,
  ) {}

  async findAll(area: string): Promise<Cleaner[]> {
    return this.cleanerModel.find({ area });
  }

  async incrementAcceptCount(cleanerId: string): Promise<Cleaner | null> {
    return this.cleanerModel.findByIdAndUpdate(
      cleanerId,
      { $inc: { acceptCount: 1 } },
      { new: true },
    );
  }

  async incrementRejectCount(cleanerId: string): Promise<Cleaner | null> {
    return this.cleanerModel.findByIdAndUpdate(
      cleanerId,
      { $inc: { rejectCount: 1 } },
      { new: true },
    );
  }
}
