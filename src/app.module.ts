import { Logger, Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { BinsModule } from './bins/bins.module';
import { AdminsModule } from './admins/admins.module';
import { MongooseModule } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { error } from 'console';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SuperadminModule } from './superadmin/superadmin.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailModule } from './email/email.module';
import { CleanerModule } from './cleaner/cleaner.module';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URL'),
        dbName: configService.get<string>('MONGO_DB'),
      }),
    }),
    AuthModule,
    BinsModule,
    AdminsModule,
    SuperadminModule,
    NotificationsModule,
    EmailModule,
    CleanerModule,
    TaskModule,
  ],
  controllers: [],
})
export class AppModule {
  private readonly logger = new Logger(AppModule.name);
  constructor() {
    mongoose.connection.on('connect', () => {
      this.logger.log('Connected to MongoDB');
    });

    mongoose.connection.on('error', () => {
      this.logger.error('MongoDB connection error: ', error);
    });
  }
}
