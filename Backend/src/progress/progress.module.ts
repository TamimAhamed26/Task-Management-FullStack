import { Module } from '@nestjs/common';
import { ProgressService } from './progress.service';
import { ProgressController } from './progress.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from '../entities/task.entity';
import { User } from 'src/entities/user.entity';
import { FileService } from '../file/file.service';
import { EmailService } from '../email/email.service';
import { UserService } from 'src/user/user.service';
import { TaskComment } from 'src/entities/TaskComment.entity';
import { TimeLog } from 'src/entities/time-log.entity';
import { Project } from 'src/entities/project.entity';
import { Team } from 'src/entities/team.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Task, User,TimeLog,Project,Team])],
  controllers: [ProgressController],
  providers: [ProgressService, FileService, EmailService, UserService],
})
export class ProgressModule {}
