import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CleanerService } from './cleaner.service';
import { CleanerSchema } from 'src/schema/cleaner.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Cleaner', schema: CleanerSchema }]),
  ],
  providers: [CleanerService],
  exports: [CleanerService],
})
export class CleanerModule {}
