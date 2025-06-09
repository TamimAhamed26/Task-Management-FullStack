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
  UploadedFile
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
import { NotificationDto } from './dto/notification.dto';

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Get('pending')
  @Roles('MANAGER')
  async getPendingTasks(): Promise<TaskDto[]> {
    return this.taskService.getPendingTasks();
  }

  @Get('sorted-by-priority')
  @Roles('MANAGER')
async getTasksSortedByPriority(): Promise<Task[]> {
  return this.taskService.getTasksSortedByPriority();
}

@Get('search')
@Roles('MANAGER')
async searchTasks(@Query('keyword') keyword: string): Promise<Task[]> {
  return this.taskService.searchTasks(keyword);
}



  @Patch(':id/assign')
  @Roles('MANAGER') 
  async assignCollaborator(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { collaboratorId: number },
  ): Promise<Task> {
    return  this.taskService.assignCollaborator(id, body.collaboratorId) ;
  }
@Get('/id')
@Roles('MANAGER')
async getTaskById(@Param('id', ParseIntPipe) id: number) {
  return this.taskService.getTaskById(id);
}
  @Patch(':id/set-deadline-priority')
  @Roles('MANAGER')
  async setDeadlineAndPriority(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetDeadlinePriorityDto,
  ): Promise<{ message: string }> {
    await this.taskService.setDeadlineAndPriority(id, body);
    return { message: 'Deadline and Priority updated successfully.' };
  }
 
  @Patch(':id/mark-completed')
  @Roles('MANAGER')
  async markTaskAsCompleted(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.taskService.markTaskAsCompleted(id);
    return { message: 'Task marked as completed successfully.' };
  }

  @Delete(':id')
  @Roles('MANAGER') 
  async rejectTask(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.taskService.rejectTask(id);
    return { message: 'COMPLETED task deleted successfully.' };
  }


@Post(':id/comments')
@Roles('MANAGER', 'COLLABORATOR')
async createTaskComment(
  @Param('id', ParseIntPipe) id: number,
  @Body('content') content: string,
  @GetUser('id') userId: number,
): Promise<TaskCommentDto> {
  if (!content?.trim()) {
    throw new BadRequestException('Comment content cannot be empty.');
  }
  return this.taskService.createTaskComment(id, userId, content);
}

@Get(':id/comments')
@Roles('MANAGER')
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
  @Roles( 'COLLABORATOR')
  async getUserNotifications(@GetUser('id') userId: number): Promise<NotificationDto[]> {
    return this.taskService.getUserNotifications(userId);
  }

@Post('notifications/:id/read')
 @Roles('COLLABORATOR') 
async markNotificationAsRead(@Param('id', ParseIntPipe) id: number) {
  return this.taskService.markNotificationAsRead(id);
}


}
