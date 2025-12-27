import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksService } from './task.service';
import { TaskSchema } from 'src/schema/task.schema';
import { CleanerModule } from 'src/cleaner/cleaner.module';
import { BinsModule } from 'src/bins/bins.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Task', schema: TaskSchema }]),
    CleanerModule,
    forwardRef(() => BinsModule),
  ],
  providers: [TasksService],
  exports: [TasksService],
})
export class TaskModule {}
