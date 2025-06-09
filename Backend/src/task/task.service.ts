import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PriorityLevel, Task, TaskStatus } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { TaskDto } from './dto/task.dto';
import { SetDeadlinePriorityDto } from './dto/set-deadline-priority.dto';
import { TaskCommentDto } from './dto/comment.dto';
import { TaskAttachmentDto } from './dto/task-attachment.dto';
import { TaskComment } from '../entities/TaskComment.entity';
import { TaskAttachment } from '../entities/task-attachment.entity';
import { FileService } from '../file/file.service';
import { NotificationDto } from './dto/notification.dto';
import { Notification } from 'src/entities/Notification.entity'; // adjust the path as needed
import { Console } from 'console';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(TaskComment)
    private readonly commentRepository: Repository<TaskComment>,
    @InjectRepository(TaskAttachment)
    private readonly attachmentRepository: Repository<TaskAttachment>,
    private readonly fileService: FileService,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async getTaskById(taskId: number): Promise<TaskDto> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['createdBy', 'assignedTo', 'approvedBy'],
    });

    if (!task) throw new NotFoundException('Task not found.');

    return {
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate,
      createdByUsername: task.createdBy?.username || '',
      assignedToUsername: task.assignedTo?.username || '',
      approvedByUsername: task.approvedBy?.username || '',
      isCompleted: task.isCompleted,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async assignCollaborator(taskId: number, collaboratorId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found.');

    const collaborator = await this.userRepository.findOne({
      where: { id: collaboratorId },
      relations: ['role'],
    });

    if (!collaborator || collaborator.role?.id !== 3) {
      throw new BadRequestException('Assigned user must be a Collaborator.');
    }

    task.assignedTo = collaborator;
    return this.taskRepository.save(task);
  }

  async getPendingTasks(): Promise<TaskDto[]> {
    const tasks = await this.taskRepository.find({
      where: { status: TaskStatus.PENDING },
      relations: ['createdBy', 'assignedTo', 'approvedBy'],
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      category: task.category,
      dueDate: task.dueDate,
      createdByUsername: task.createdBy?.username || '',
      assignedToUsername: task.assignedTo?.username || '',
      approvedByUsername: task.approvedBy?.username || '',
      isCompleted: task.isCompleted,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }

  async getTasksSortedByPriority(): Promise<Task[]> {
    const tasks = await this.taskRepository.find({
      relations: ['createdBy', 'assignedTo', 'approvedBy'],
    });

    const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
    return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  async searchTasks(keyword: string): Promise<Task[]> {
    return this.taskRepository.find({
      where: [
        { title: ILike(`%${keyword}%`) },
        { description: ILike(`%${keyword}%`) },
      ],
    });
  }

  async rejectTask(taskId: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) throw new NotFoundException('Task not found.');
    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Only COMPLETED tasks can be deleted.');
    }

    await this.taskRepository.remove(task);
  }

  async markTaskAsCompleted(taskId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) throw new NotFoundException('Task not found.');
    if (task.status === TaskStatus.COMPLETED && task.isCompleted) {
      throw new BadRequestException('Task is already marked as completed.');
    }

    task.status = TaskStatus.COMPLETED;
    task.isCompleted = true;

    return this.taskRepository.save(task);
  }

  async setDeadlineAndPriority(taskId: number, updates: SetDeadlinePriorityDto): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });

    if (!task) throw new NotFoundException('Task not found.');
    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Cannot change the deadline for a completed task.');
    }

    if (updates.dueDate && new Date(updates.dueDate) < new Date()) {
      throw new BadRequestException('Due date cannot be in the past.');
    }

    if (updates.priority && !Object.values(PriorityLevel).includes(updates.priority)) {
      throw new BadRequestException('Invalid priority level.');
    }

    if (updates.dueDate) task.dueDate = new Date(updates.dueDate);
    if (updates.priority) task.priority = updates.priority;

    await this.taskRepository.save(task);
  }

 async createTaskComment(taskId: number, userId: number, content: string): Promise<TaskCommentDto> {
  const task = await this.taskRepository.findOne({
    where: { id: taskId },
    relations: ['assignedTo'], 
  });
  if (!task) throw new NotFoundException('Task not found.');

  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['role'],
  });
  if (!user) throw new NotFoundException('User not found.');

  const isManager = user.role?.name === 'Manager';
  const isAssigned = user.id === task.assignedTo?.id;

  if (!isManager && !isAssigned) {
    throw new ForbiddenException('Only managers or assigned users can comment.');
  }

  const mentionUsernames = content.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];

  const mentionedUsers = mentionUsernames.length > 0
    ? await this.userRepository.find({
        where: mentionUsernames.map(username => ({
          username,
          role: { name: 'Collaborator' },
        })),
        relations: ['role'],
        select: ['id', 'username'],
      })
    : [];

  if (mentionedUsers.length < mentionUsernames.length) {
    const invalidUsernames = mentionUsernames.filter(
      name => !mentionedUsers.some(u => u.username === name)
    );
    throw new BadRequestException(`Invalid or unauthorized mentions: ${invalidUsernames.join(', ')}`);
  }

  for (const mentionedUser of mentionedUsers) {
    const notification = this.notificationRepository.create({
      recipient: mentionedUser,
      type: 'mention',
      message: `${user.username} mentioned you in a comment on Task #${taskId}`,
      relatedTaskId: taskId,
    });
    await this.notificationRepository.save(notification);
  }

  const comment = this.commentRepository.create({
    task,
    author: user,
    content,
    mentions: mentionedUsers.map(u => u.id),
  });

  const savedComment = await this.commentRepository.save(comment);

  return {
    id: savedComment.id,
    taskId: savedComment.task.id,
    authorUsername: savedComment.author.username,
    content: savedComment.content,
    mentions: savedComment.mentions,
    createdAt: savedComment.createdAt,
  };
}


  async getTaskComments(taskId: number): Promise<TaskCommentDto[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found.');

    const comments = await this.commentRepository.find({
      where: { task: { id: taskId } },
      relations: ['task', 'author'],
      order: { createdAt: 'ASC' },
    });

    return comments.map(comment => ({
      id: comment.id,
      taskId: comment.task.id,
      authorUsername: comment.author.username,
      content: comment.content,
      mentions: comment.mentions,
      createdAt: comment.createdAt,
    }));
  }

  async uploadTaskAttachment(taskId: number, userId: number, file: Express.Multer.File): Promise<TaskAttachmentDto> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found.');

    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['role'] });
    if (!user) throw new NotFoundException('User not found.');

    if (user.role.id !== 2 && user.id !== task.assignedTo?.id) {
      throw new ForbiddenException('Only managers or assigned users can upload attachments.');
    }

    const { fileUrl } = await this.fileService.uploadFile(file);

    const attachment = this.attachmentRepository.create({
      task,
      uploader: user,
      fileName: file.originalname,
      fileUrl,
    });

    const savedAttachment = await this.attachmentRepository.save(attachment);

    return {
      id: savedAttachment.id,
      taskId: savedAttachment.task.id,
      uploaderUsername: savedAttachment.uploader.username,
      fileName: savedAttachment.fileName,
      fileUrl: savedAttachment.fileUrl,
      uploadedAt: savedAttachment.uploadedAt,
    };
  }

  async getTaskAttachments(taskId: number): Promise<TaskAttachmentDto[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found.');

    const attachments = await this.attachmentRepository.find({
      where: { task: { id: taskId } },
      relations: ['task', 'uploader'],
      order: { uploadedAt: 'ASC' },
    });

    return attachments.map(attachment => ({
      id: attachment.id,
      taskId: attachment.task.id,
      uploaderUsername: attachment.uploader.username,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      uploadedAt: attachment.uploadedAt,
    }));
  }

// services/task.service.ts
// services/task.service.ts
async getUserNotifications(userId: number): Promise<NotificationDto[]> {
  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['role'],
  });
  if (!user) throw new NotFoundException('User not found');

  console.log('User role:', user.role.name);

  const notifications = await this.notificationRepository.find({
    where: { recipient: { id: userId } },
    relations: ['task'],
    order: { createdAt: 'DESC' },
  });

  console.log('Notifications:', notifications);
  return notifications.map(n => ({
    id: n.id,
    type: n.type,
    message: n.message,
    isRead: n.isRead,
    relatedTaskId: n.relatedTaskId,
    taskTitle: n.task?.title || 'Unknown Task',
    createdAt: n.createdAt,
  }));
}
async markNotificationAsRead(notificationId: number): Promise<{ message: string }> {
  const notification = await this.notificationRepository.findOne({ where: { id: notificationId } });

  if (!notification) {
    throw new NotFoundException('Notification not found.');
  }

  if (notification.isRead) {
    return { message: 'Notification already marked as read.' };
  }

  notification.isRead = true;
  await this.notificationRepository.save(notification);

  return { message: 'Notification marked as read.' };
}



}
