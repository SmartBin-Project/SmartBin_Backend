import {
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from 'src/schema/task.schema';
import { CleanerService } from 'src/cleaner/cleaner.service';
import { BinsService } from 'src/bins/bins.service';
import { TelegramService } from 'src/notifications/telegram.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @InjectModel('Task') private taskModel: Model<Task>,
    private cleanerService: CleanerService,
    @Inject(forwardRef(() => BinsService))
    private binsService: BinsService,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
  ) {}

  // 1. Logic to Assign/Re-assign a Task
  async assignTaskToRandomCleaner(
    binId: string,
    area: string,
    existingTask?: Task,
  ) {
    this.logger.log(`Assigning task for bin ${binId} in area ${area}`);

    // Get all cleaners in the area
    const cleaners = await this.cleanerService.findAll(area);
    this.logger.log(`Found ${cleaners.length} cleaners in area ${area}`);

    if (cleaners.length === 0) {
      this.logger.warn(`No cleaners found in area ${area}`);
      return null;
    }

    // Filter out cleaners who already rejected this task
    const rejectedIds = existingTask ? existingTask.rejectedBy.map(String) : [];
    const eligibleCleaners = cleaners.filter(
      (c) => !rejectedIds.includes(c._id.toString()),
    );

    if (eligibleCleaners.length === 0) {
      this.logger.warn('No eligible cleaners found for this bin!');
      // Optional: Send alert to Admin that no one is available
      return null;
    }

    // Pick a Random Cleaner
    const randomIndex = Math.floor(Math.random() * eligibleCleaners.length);
    const selectedCleaner = eligibleCleaners[randomIndex];
    this.logger.log(
      `Selected cleaner ${selectedCleaner._id} (${selectedCleaner.name}), telegramChatId: ${selectedCleaner.telegramChatId}`,
    );

    let savedTask: Task;

    if (existingTask) {
      // Re-assign existing task
      existingTask.assignedCleanerId = selectedCleaner._id.toString();
      existingTask.status = 'PENDING';
      savedTask = await existingTask.save();
    } else {
      // Create new task
      savedTask = await this.taskModel.create({
        binId,
        assignedCleanerId: selectedCleaner._id,
        status: 'PENDING',
        rejectedBy: [],
      });
      this.logger.log(`Task created: ${savedTask._id}`);
    }

    if (selectedCleaner.telegramChatId) {
      const message =
        `🚨 *New Task Alert* 🚨\n\n` +
        `A bin in your area (${area}) is full and needs cleaning.\n` +
        `Bin ID: ${binId}\n` +
        `Please check your app for details.`;

      this.logger.log(
        `Sending Telegram alert to cleaner ${selectedCleaner._id}`,
      );
      await this.telegramService.sendTaskRequest(
        selectedCleaner.telegramChatId,
        message,
        savedTask._id.toString(),
      );
    } else {
      this.logger.warn(
        `Cleaner ${selectedCleaner._id} has no Telegram chat ID`,
      );
    }

    return savedTask;
  }

  // 2. Cleaner Accepts Task
  async acceptTask(taskId: string) {
    const task = await this.taskModel.findByIdAndUpdate(taskId, {
      status: 'COMPLETED',
      acceptedAt: new Date(),
    });

    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  // 3. Cleaner Rejects Task -> Trigger Re-assignment
  async rejectTask(taskId: string) {
    const task = await this.taskModel.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    // Add to rejected list
    task.rejectedBy.push(task.assignedCleanerId);
    task.rejectionCount += 1;
    task.assignedCleanerId = ''; // Unassign temporarily
    await task.save();

    const bin = await this.binsService.findById(task.binId);
    if (bin) {
      return this.assignTaskToRandomCleaner(task.binId, bin.area, task);
    }
  }
}
