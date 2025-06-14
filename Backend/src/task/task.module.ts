import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { TaskService } from './task.service';
import { TaskController } from './task.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { APP_GUARD } from '@nestjs/core';
import { UserModule } from '../user/user.module';  
import { User } from 'src/entities/user.entity';
import { TaskComment } from 'src/entities/TaskComment.entity';
import { TaskAttachment } from 'src/entities/task-attachment.entity';
import { FileService } from 'src/file/file.service';
import { FileModule } from '../file/file.module'; 
import { Notification } from 'src/entities/Notification.entity'; 
import { TaskHistory } from 'src/entities/task_history.entity';
import { TimeLog } from 'src/entities/time-log.entity';
import { Team } from 'src/entities/team.entity';
import { Project } from 'src/entities/project.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([Task,User,TaskComment,Project,Team, TaskAttachment,Notification,TimeLog,TaskHistory]),
    UserModule,     FileModule, 

  ],
  controllers: [TaskController],
  providers: [
    FileService, 

    TaskService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class TaskModule {}
