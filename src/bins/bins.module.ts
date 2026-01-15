import { forwardRef, Module } from '@nestjs/common';
import { BinsController } from './bins.controller';
import { BinsService } from './bins.service';
import { BinSchema } from 'src/schema/bin.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { TaskModule } from 'src/task/task.module';
import { TranslationService } from 'src/common/translation.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Bin', schema: BinSchema }]),
    forwardRef(() => TaskModule),
  ],
  controllers: [BinsController],
  providers: [
    BinsService,
    TranslationService
  ],
  exports: [BinsService],
})
export class BinsModule {}
