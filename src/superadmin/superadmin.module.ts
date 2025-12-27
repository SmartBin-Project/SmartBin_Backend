import { Module } from '@nestjs/common';
import { SuperAdminController } from './superadmin.controller';
import { SuperadminService } from './superadmin.service';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminSchema } from 'src/schema/admin.schema';
import { BinSchema } from 'src/schema/bin.schema';
import { TaskSchema } from 'src/schema/task.schema';
import { CleanerSchema } from 'src/schema/cleaner.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Admin', schema: AdminSchema },
      { name: 'Bin', schema: BinSchema },
      { name: 'Task', schema: TaskSchema },
      { name: 'Cleaner', schema: CleanerSchema },
    ]),
  ],
  controllers: [SuperAdminController],
  providers: [SuperadminService],
})
export class SuperadminModule {}
