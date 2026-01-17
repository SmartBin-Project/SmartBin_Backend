import { forwardRef, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ConfigModule } from '@nestjs/config';
import { TaskModule } from 'src/task/task.module';

@Module({
  imports: [ConfigModule, forwardRef(() => TaskModule)],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class NotificationsModule {}
