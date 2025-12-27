import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from 'src/schema/task.schema';
import { CleanerService } from 'src/cleaner/cleaner.service';
import { BinsService } from 'src/bins/bins.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel('Task') private taskModel: Model<Task>,
    private cleanerService: CleanerService,
    @Inject(forwardRef(() => BinsService))
    private binsService: BinsService,
  ) {}

  // 1. Logic to Assign/Re-assign a Task
  async assignTaskToRandomCleaner(
    binId: string,
    area: string,
    existingTask?: Task,
  ) {
    // Get all cleaners in the area
    const cleaners = await this.cleanerService.findAll(area);

    // Filter out cleaners who already rejected this task
    const rejectedIds = existingTask ? existingTask.rejectedBy.map(String) : [];
    const eligibleCleaners = cleaners.filter(
      (c) => !rejectedIds.includes(c._id.toString()),
    );

    if (eligibleCleaners.length === 0) {
      console.log('No eligible cleaners found for this bin!');
      // Optional: Send alert to Admin that no one is available
      return null;
    }

    // Pick a Random Cleaner
    const randomIndex = Math.floor(Math.random() * eligibleCleaners.length);
    const selectedCleaner = eligibleCleaners[randomIndex];

    if (existingTask) {
      // Re-assign existing task
      existingTask.assignedCleanerId = selectedCleaner._id.toString();
      existingTask.status = 'PENDING';
      return existingTask.save();
    } else {
      // Create new task
      return this.taskModel.create({
        binId,
        assignedCleanerId: selectedCleaner._id,
        status: 'PENDING',
        rejectedBy: [],
      });
    }
  }

  // 2. Cleaner Accepts Task
  async acceptTask(taskId: string) {
    const task = await this.taskModel.findByIdAndUpdate(taskId, {
      status: 'COMPLETED',
    });

    if (!task) throw new NotFoundException('Task not found');
    await this.binsService.clearBinTask(task.binId);
  }

  // 3. Cleaner Rejects Task -> Trigger Re-assignment
  async rejectTask(taskId: string, cleanerId: string, binArea: string) {
    const task = await this.taskModel.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    // Add to rejected list
    task.rejectedBy.push(cleanerId);
    task.rejectionCount += 1;
    task.assignedCleanerId = ''; // Unassign temporarily
    await task.save();

    // Trigger logic to find the NEXT random person
    return this.assignTaskToRandomCleaner(task.binId, binArea, task);
  }
}
