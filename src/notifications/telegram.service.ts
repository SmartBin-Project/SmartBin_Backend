import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import { TasksService } from 'src/task/task.service';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: TelegramBot;
  private readonly logger = new Logger(TelegramService.name);

  constructor(
    private configService: ConfigService,
    @Inject(forwardRef(() => TasksService))
    private tasksService: TasksService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    this.logger.log(`Telegram Bot Token: ${token ? 'SET' : 'NOT SET'}`);
    if (token) {
      this.bot = new TelegramBot(token, { polling: true });
      this.logger.log('Telegram Bot initialized successfully');
    } else {
      this.logger.warn('Telegram Bot Token not found in environment variables');
    }
  }

  onModuleInit() {
    if (!this.bot) return;

    // Listen for Button Clicks
    this.bot.on('callback_query', async (query) => {
      const { data, message, from } = query;

      if (!message || !data || !from) {
        this.logger.warn('Invalid callback query: missing required fields');
        return;
      }

      const chatId = message.chat.id;
      const [action, taskId] = data.split('_'); // Format: "pick_TASKID"

      try {
        if (action === 'pick') {
          await this.tasksService.acceptTask(taskId);

          // Update the message to remove buttons
          await this.bot.editMessageText(
            `✅ Task Accepted! You are assigned to this bin.`,
            {
              chat_id: chatId,
              message_id: message.message_id,
            },
          );
        } else if (action === 'busy') {
          // We pass the cleanerId (from telegram user id) and taskId for identification
          await this.tasksService.rejectTask(taskId);

          await this.bot.editMessageText(
            `❌ Task Rejected. Searching for another cleaner...`,
            {
              chat_id: chatId,
              message_id: message.message_id,
            },
          );
        }
      } catch (error) {
        this.logger.error('Error handling telegram button', error);
        await this.bot.answerCallbackQuery(query.id, {
          text: 'Error processing request. The task might be expired.',
        });
      }
    });
  }

  async sendTaskRequest(chatId: string, messageText: string, taskId: string) {
    this.logger.log(
      `sendTaskRequest called with chatId: ${chatId}, taskId: ${taskId}`,
    );

    if (!this.bot) {
      this.logger.error('Telegram bot is not initialized');
      return;
    }

    try {
      this.logger.log(`Attempting to send message to ${chatId}`);
      await this.bot.sendMessage(chatId, messageText, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '✅ Pick (Accept)', callback_data: `pick_${taskId}` },
              { text: '🚫 Busy (Reject)', callback_data: `busy_${taskId}` },
            ],
          ],
        },
      });
      this.logger.log(`Task request sent successfully to ${chatId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send Telegram message to ${chatId}: ${error.message}`,
        error,
      );
    }
  }
}
