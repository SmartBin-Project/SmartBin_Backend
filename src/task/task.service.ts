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

  async assignTaskToRandomCleaner(
    binId: string,
    area: string,
    existingTask?: Task,
  ) {
    this.logger.log(
      `========== ASSIGN TASK START: binId=${binId}, area=${area} ==========`,
    );

    // Get all cleaners in the area
    const cleaners = await this.cleanerService.findAll(area);
    this.logger.log(
      `[ASSIGN] Found ${cleaners.length} cleaners in area ${area}`,
    );

    if (cleaners.length === 0) {
      this.logger.warn(`[ASSIGN] No cleaners found in area ${area}`);
      return null;
    }

    // Filter out cleaners who already rejected this task
    const rejectedIds = existingTask
      ? existingTask.rejectedBy.map((id) => id.toString())
      : [];
    this.logger.log(
      `[ASSIGN] Rejected IDs for this task: ${JSON.stringify(rejectedIds)}`,
    );

    const eligibleCleaners = cleaners.filter(
      (c) => !rejectedIds.includes(c._id.toString()),
    );

    this.logger.log(
      `[ASSIGN] Eligible cleaners: ${eligibleCleaners.length} out of ${cleaners.length}`,
    );

    if (eligibleCleaners.length === 0) {
      this.logger.warn('[ASSIGN] No eligible cleaners found for this bin!');
      return null;
    }

    // Pick a Random Cleaner
    const randomIndex = Math.floor(Math.random() * eligibleCleaners.length);
    const selectedCleaner = eligibleCleaners[randomIndex];
    this.logger.log(
      `[ASSIGN] Selected cleaner ${selectedCleaner._id} (${selectedCleaner.name}), telegramChatId: ${selectedCleaner.telegramChatId}`,
    );

    let savedTask: Task | null;

    if (existingTask) {
      // Re-assign existing task using findByIdAndUpdate to avoid validation
      this.logger.log(`[ASSIGN] Re-assigning existing task to new cleaner`);
      savedTask = await this.taskModel.findByIdAndUpdate(
        existingTask._id,
        {
          $set: {
            assignedCleanerId: selectedCleaner._id.toString(),
            status: 'PENDING',
          },
        },
        { new: true, runValidators: false },
      );

      if (!savedTask) {
        this.logger.error(`[ASSIGN] Failed to update existing task`);
        return null;
      }
    } else {
      // Create new task
      this.logger.log(`[ASSIGN] Creating new task`);
      savedTask = await this.taskModel.create({
        binId,
        assignedCleanerId: selectedCleaner._id,
        status: 'PENDING',
        rejectedBy: [],
      });
      this.logger.log(`[ASSIGN] Task created: ${savedTask._id}`);
    }

    if (selectedCleaner.telegramChatId) {
      const message =
        `🚨 *New Task Alert* 🚨\n\n` +
        `A bin in your area (${area}) is full and needs cleaning.\n` +
        `Bin ID: ${binId}\n` +
        `Please check your app for details.`;

      this.logger.log(
        `[ASSIGN] Sending Telegram alert to cleaner ${selectedCleaner._id}`,
      );
      await this.telegramService.sendTaskRequest(
        selectedCleaner.telegramChatId,
        message,
        savedTask._id.toString(),
      );
      this.logger.log(
        `[ASSIGN] ✅ Alert sent to cleaner ${selectedCleaner.name}`,
      );
    } else {
      this.logger.warn(
        `[ASSIGN] Cleaner ${selectedCleaner._id} has no Telegram chat ID`,
      );
    }

    this.logger.log(`========== ASSIGN TASK SUCCESS ==========`);
    return savedTask;
  }

  async findById(id: string) {
    return this.taskModel.findById(id);
  }

  // 2. Cleaner Accepts Task
  async acceptTask(taskId: string) {
    const task = await this.taskModel.findById(taskId);
    if (!task) throw new NotFoundException('Task not found');

    if (!task.assignedCleanerId) {
      throw new NotFoundException('Task has no assigned cleaner');
    }

    const cleanerId = task.assignedCleanerId.toString();

    // Update task using findByIdAndUpdate to avoid validation
    const updatedTask = await this.taskModel.findByIdAndUpdate(
      taskId,
      {
        $set: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
        },
      },
      { new: true, runValidators: false },
    );

    // Increment cleaner's accept count
    await this.cleanerService.incrementAcceptCount(cleanerId);

    return updatedTask;
  }

  // 3. Cleaner Rejects Task -> Trigger Re-assignment
  async rejectTask(taskId: string) {
    try {
      this.logger.log(`========== REJECT TASK START: ${taskId} ==========`);

      const task = await this.taskModel.findById(taskId);
      if (!task) throw new NotFoundException('Task not found');

      if (!task.assignedCleanerId) {
        throw new NotFoundException('Task has no assigned cleaner to reject');
      }

      const cleanerId = task.assignedCleanerId.toString();
      const binId = task.binId.toString();

      this.logger.log(
        `[REJECT] Cleaner ${cleanerId} rejecting task ${taskId}. Current rejectedBy: ${JSON.stringify(task.rejectedBy)}`,
      );

      // Update task using only MongoDB operators to avoid casting issues
      const updatedTask = await this.taskModel.findByIdAndUpdate(
        taskId,
        {
          $push: { rejectedBy: cleanerId },
          $inc: { rejectionCount: 1 },
          $set: { assignedCleanerId: null },
        },
        { new: true, runValidators: false },
      );

      if (!updatedTask) {
        throw new NotFoundException('Failed to update task');
      }

      this.logger.log(
        `[REJECT] Task ${taskId} updated. rejectedBy: ${JSON.stringify(updatedTask.rejectedBy)}, rejectionCount: ${updatedTask.rejectionCount}`,
      );

      // Increment cleaner's reject count
      await this.cleanerService.incrementRejectCount(cleanerId);
      this.logger.log(
        `[REJECT] Incremented reject count for cleaner ${cleanerId}`,
      );

      const bin = await this.binsService.findById(binId);
      if (!bin) {
        this.logger.error(`[REJECT] Bin not found for task ${taskId}`);
        return null;
      }

      this.logger.log(
        `[REJECT] Found bin ${bin._id} with area ${bin.area.en}. Attempting to reassign task...`,
      );

      const newTask = await this.assignTaskToRandomCleaner(
        binId,
        bin.area.en,
        updatedTask,
      );

      if (!newTask) {
        this.logger.warn(
          `[REJECT] No more cleaners available for task ${taskId}. All cleaners rejected!`,
        );
        // Mark task as rejected and set timestamp for 5-minute re-alert
        const now = new Date();
        await this.taskModel.findByIdAndUpdate(
          taskId,
          {
            $set: {
              status: 'REJECTED',
              lastRejectionAlertAt: now,
            },
          },
          { runValidators: false },
        );

        this.logger.log(
          `[REJECT] Setting re-alert timestamp. Cleaners will be re-asked in 5 minutes.`,
        );
        return null;
      }

      this.logger.log(
        `[REJECT] ✅ Task ${taskId} successfully reassigned to cleaner ${newTask.assignedCleanerId}`,
      );
      this.logger.log(`========== REJECT TASK SUCCESS: ${taskId} ==========`);
      return newTask;
    } catch (error) {
      this.logger.error(
        `[REJECT] ERROR in rejectTask: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // 4. Check and Re-alert Cleaners after 5 minutes of all rejections
  async checkAndReAlertAfterRejection(taskId: string) {
    try {
      this.logger.log(`========== RE-ALERT CHECK START: ${taskId} ==========`);

      const task = await this.taskModel.findById(taskId);
      if (!task) {
        this.logger.warn(`[RE-ALERT] Task ${taskId} not found`);
        return null;
      }

      // Only process if status is REJECTED
      if (task.status !== 'REJECTED') {
        this.logger.log(
          `[RE-ALERT] Task is not in REJECTED status. Status: ${task.status}`,
        );
        return null;
      }

      // Check if lastRejectionAlertAt exists and if 5 minutes have passed
      if (!task.lastRejectionAlertAt) {
        this.logger.log(`[RE-ALERT] No lastRejectionAlertAt timestamp found`);
        return null;
      }

      const now = new Date();
      const timeSinceLastAlert =
        (now.getTime() - new Date(task.lastRejectionAlertAt).getTime()) /
        (1000 * 60);

      // Only re-alert if 5 minutes have passed
      if (timeSinceLastAlert < 5) {
        this.logger.log(
          `[RE-ALERT] Only ${timeSinceLastAlert.toFixed(1)} minutes since last alert. Waiting...`,
        );
        return null;
      }

      this.logger.log(
        `[RE-ALERT] 5+ minutes have passed. Resetting rejection list and re-assigning...`,
      );

      const bin = await this.binsService.findById(task.binId.toString());
      if (!bin) {
        this.logger.error(`[RE-ALERT] Bin not found for task ${taskId}`);
        return null;
      }

      // Reset rejectedBy and rejectionCount, change status back to PENDING
      const resetTask = await this.taskModel.findByIdAndUpdate(
        taskId,
        {
          $set: {
            rejectedBy: [],
            rejectionCount: 0,
            status: 'PENDING',
            lastRejectionAlertAt: null,
            assignedCleanerId: null,
          },
        },
        { new: true, runValidators: false },
      );

      if (!resetTask) {
        this.logger.error(`[RE-ALERT] Failed to reset task ${taskId}`);
        return null;
      }

      this.logger.log(
        `[RE-ALERT] Task reset. Assigning to random cleaner again...`,
      );

      // Try to assign to a new cleaner with fresh list
      const newTask = await this.assignTaskToRandomCleaner(
        bin._id.toString(),
        bin.area.en,
        resetTask,
      );

      if (newTask) {
        this.logger.log(
          `[RE-ALERT] ✅ Successfully re-assigned task to cleaner ${newTask.assignedCleanerId}`,
        );
      } else {
        this.logger.warn(
          `[RE-ALERT] Still no cleaners available. Will try again in 5 minutes.`,
        );
      }

      this.logger.log(`========== RE-ALERT CHECK SUCCESS ==========`);
      return newTask;
    } catch (error) {
      this.logger.error(`[RE-ALERT] ERROR: ${error.message}`, error.stack);
      return null;
    }
  }
}
