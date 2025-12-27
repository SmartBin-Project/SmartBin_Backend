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
}
