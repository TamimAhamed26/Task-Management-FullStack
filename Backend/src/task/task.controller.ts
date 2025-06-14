import {
  Controller,
  Patch,
  Get,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Query,
  Post,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ValidationPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { PriorityLevel, Task } from '../entities/task.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { TaskDto } from './dto/task.dto';
import { SetDeadlinePriorityDto } from './dto/set-deadline-priority.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';
import { TaskCommentDto } from './dto/comment.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { TaskAttachmentDto } from './dto/task-attachment.dto';
import { TaskHistoryDto } from './dto/task-history.dto';
import { AuthGuard } from '@nestjs/passport';
import { NotificationDto } from './dto/notification.dto';
import { CreateTimeLogDto, TimeLogDto } from './dto/time-log.dto';
import { SearchTaskDto } from './dto/search-task.dto';
import { ManagerOverviewDto, OverdueTaskDto, ProjectDto, TaskPrioritySummaryDto } from './dto/ManagerReporting.dto';
import { CreateTaskDto } from './dto/createtaskdto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { ProgressReportDto } from 'src/progress/dto/ProgressReportDto';

@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

 @Get('pending')
  @Roles('MANAGER')
  async getPendingTasks(
    @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number,
    @Query('projectName') projectName?: string,
  ): Promise<TaskDto[]> {
    if (projectId && projectName) {
      throw new BadRequestException('Provide either projectId or projectName, not both');
    }
    return this.taskService.getPendingTasks(projectId, projectName);
  }


  @Get('sorted-by-priority')
  @Roles('MANAGER')
  async getTasksSortedByPriority(): Promise<Task[]> {
    return this.taskService.getTasksSortedByPriority();
  }

   @Get('search')
  @Roles('MANAGER')
  async searchTasks(
    @Query(ValidationPipe) searchDto: SearchTaskDto,
  ): Promise<TaskDto[]> {
    return this.taskService.searchTasks(searchDto);
  }
  @Patch(':id/assign')
  @Roles('MANAGER')
  async assignCollaborator(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { collaboratorId: number },
    @GetUser('id') userId: number,
  ): Promise<Task> {
    return this.taskService.assignCollaborator(id, body.collaboratorId, userId);
  }

  @Get('task/:id')
  @Roles('MANAGER')
  async getTaskById(@Param('id', ParseIntPipe) id: number): Promise<TaskDto> {
    return this.taskService.getTaskById(id);
  }

  @Patch(':id/set-deadline-priority')
  @Roles('MANAGER')
  async setDeadlineAndPriority(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetDeadlinePriorityDto,
    @GetUser('id') userId: number,
  ): Promise<{ message: string}> {
    await this.taskService.setDeadlineAndPriority(id, body, userId);
    return { message: 'Deadline and Priority updated successfully.' };
  }

@Patch(':id/mark-completed')
  @Roles('MANAGER', 'COLLABORATOR') 
  async markTaskAsCompleted(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ): Promise<{ message: string }> {
    await this.taskService.markTaskAsCompleted(id, userId);
    return { message: 'Task marked as pending approval or completed successfully.' };
  }
  @Delete(':id')
  @Roles('MANAGER')
  async rejectTask(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ): Promise<{ message: string }> {
    await this.taskService.rejectTask(id, userId);
    return { message: 'COMPLETED or PENDING_APPROVAL task deleted successfully.' };
  }


@Post(':id/comments')
  @Roles('MANAGER', 'COLLABORATOR')
  async createTaskComment(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
    @Body('content') content: string,
    @Body('parentCommentId') parentCommentId?: string, 
  ): Promise<TaskCommentDto> {
    if (!content?.trim()) {
      throw new BadRequestException('Comment content cannot be empty.');
    }

    let parsedParentCommentId: number | undefined;
    if (parentCommentId) {
      const parsed = parseInt(parentCommentId, 10);
      if (isNaN(parsed)) {
        throw new BadRequestException('parentCommentId must be a valid number.');
      }
      parsedParentCommentId = parsed;
    }

    return this.taskService.createTaskComment(id, userId, content, parsedParentCommentId);
  }

  @Get(':id/comments')
  @Roles('MANAGER', 'COLLABORATOR')
  async getTaskComments(@Param('id', ParseIntPipe) id: number): Promise<TaskCommentDto[]> {
    return this.taskService.getTaskComments(id);
  }
  @Post(':id/attachments')
  @Roles('MANAGER')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTaskAttachment(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @GetUser('id') userId: number,
  ): Promise<TaskAttachmentDto> {
    return this.taskService.uploadTaskAttachment(id, userId, file);
  }

  @Get(':id/attachments')
  @Roles('COLLABORATOR')
  async getTaskAttachments(@Param('id', ParseIntPipe) id: number): Promise<TaskAttachmentDto[]> {
    return this.taskService.getTaskAttachments(id);
  }

  @Get('notifications')
  @Roles('COLLABORATOR')
  async getUserNotifications(@GetUser('id') userId: number): Promise<NotificationDto[]> {
    return this.taskService.getUserNotifications(userId);
  }

  @Post('notifications/:id/read')
  @Roles('COLLABORATOR')
  async markNotificationAsRead(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ): Promise<void> {
    await this.taskService.markNotificationAsRead(id, userId);
  }

  @Get(':id/history')
  @Roles('MANAGER', 'COLLABORATOR')
  async getTaskHistory(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ): Promise<TaskHistoryDto[]> {
    return this.taskService.getTaskHistory(id, userId);
  }
  
  @Post(':id/time-logs')
  @Roles('MANAGER', 'COLLABORATOR')
  async createTimeLog(
    @Param('id', ParseIntPipe) id: number,
    @Body() createTimeLogDto: CreateTimeLogDto,
    @GetUser('id') userId: number,
  ): Promise<TimeLogDto> {
    return this.taskService.createTimeLog(id, userId, createTimeLogDto);
  }

  @Get(':id/time-logs')
  @Roles('MANAGER', 'COLLABORATOR')
  async getTimeLogs(
    @Param('id', ParseIntPipe) id: number,
    @GetUser('id') userId: number,
  ): Promise<TimeLogDto[]> {
    return this.taskService.getTimeLogs(id, userId);
  }

  
  @Get('overview')
  @Roles('MANAGER')
  async getManagerOverview(@GetUser('id') userId: number): Promise<ManagerOverviewDto> {
    return this.taskService.getManagerOverview(userId);
  }

  @Get('reports/overdue')
  @Roles('MANAGER')
  async getOverdueTasks(@GetUser('id') userId: number): Promise<OverdueTaskDto[]> {
    return this.taskService.getOverdueTasks(userId);
  }

  @Get('projects')
  @Roles('MANAGER', 'COLLABORATOR')
  async getProjects(@GetUser('id') userId: number): Promise<ProjectDto[]> {
    return this.taskService.getProjects(userId);
  }
@Post()
@Roles('MANAGER')
async createTask(
  @Body(ValidationPipe) createTaskDto: CreateTaskDto,
  @GetUser('id') userId: number,
): Promise<TaskDto> {
  return this.taskService.createTask(createTaskDto, userId);
}


@Patch(':id/status')
@Roles('MANAGER', 'COLLABORATOR')
async updateTaskStatus(
  @Param('id', ParseIntPipe) id: number,
  @Body(ValidationPipe) updateTaskStatusDto: UpdateTaskStatusDto,
  @GetUser('id') userId: number,
): Promise<TaskDto> {
  return this.taskService.updateTaskStatus(id, updateTaskStatusDto, userId);
}
@Get('recent')
@Roles('MANAGER', 'COLLABORATOR')
async getRecentTasks(
  @GetUser('id') userId: number,
@Query('projectId') projectIdRaw?: string,
): Promise<TaskDto[]> {
  const projectId = projectIdRaw ? parseInt(projectIdRaw) : undefined;
  return this.taskService.getRecentTasks(userId, projectId);
}

@Get('summary/by-priority')
@Roles('MANAGER')
async getTaskPrioritySummary(
  @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number,
): Promise<TaskPrioritySummaryDto[]> {
  return this.taskService.getTaskPrioritySummary(projectId);
}
  @Get('projects/:id/tasks')
  @Roles('MANAGER', 'COLLABORATOR')
  async getProjectTasks(
    @Param('id', ParseIntPipe) projectId: number,
    @GetUser('id') userId: number,
   @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ): Promise<{ data: TaskDto[]; total: number; page: number; limit: number }> {
    return this.taskService.getProjectTasks(projectId, userId, page, limit);
  }

  @Post('projects/:id/team/add')
  @Roles('MANAGER')
  async addTeamMember(
    @Param('id', ParseIntPipe) projectId: number,
    @Body('userId', ParseIntPipe) memberId: number,
    @GetUser('id') currentUserId: number,
  ): Promise<void> {
    await this.taskService.addTeamMember(projectId, currentUserId, memberId);
  }

  @Post('projects/:id/team/remove')
  @Roles('MANAGER')
  async removeTeamMember(
    @Param('id', ParseIntPipe) projectId: number,
    @Body('userId', ParseIntPipe) memberId: number,
    @GetUser('id') currentUserId: number,
  ): Promise<void> {
    await this.taskService.removeTeamMember(projectId, currentUserId, memberId);
  }




}