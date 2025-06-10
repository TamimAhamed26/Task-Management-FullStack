import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, QueryRunner, Repository } from 'typeorm';
import { PriorityLevel, Task, TaskStatus } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { TaskDto } from './dto/task.dto';
import { SetDeadlinePriorityDto } from './dto/set-deadline-priority.dto';
import { TaskCommentDto } from './dto/comment.dto';
import { TaskAttachmentDto } from './dto/task-attachment.dto';
import { TaskComment } from '../entities/TaskComment.entity';
import { TaskAttachment } from '../entities/task-attachment.entity';
import { NotificationDto } from './dto/notification.dto';
import { Notification } from '../entities/Notification.entity';
import { TaskHistory } from '../entities/task_history.entity';
import { TaskHistoryDto } from './dto/task-history.dto';
import { FileService } from 'src/file/file.service';
import { TimeLog } from 'src/entities/time-log.entity';
import { CreateTimeLogDto, TimeLogDto } from './dto/time-log.dto';

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
    @InjectRepository(TaskHistory)
    private readonly taskHistoryRepository: Repository<TaskHistory>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly fileService: FileService,
    @InjectRepository(TimeLog) 
    private readonly timeLogRepository: Repository<TimeLog>,

  ) {}

  private async logTaskHistory(
    task: Task,
    userId: number,
    action: string,
    details: any,
    queryRunner?: QueryRunner,
  ): Promise<void> {
    const user = queryRunner
      ? await queryRunner.manager.findOne(User, { where: { id: userId } })
      : await this.userRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const history = this.taskHistoryRepository.create({
      taskId: task.id, // Use taskId directly
      changedBy: user,
      action,
      details,
    });

    if (queryRunner) {
      await queryRunner.manager.save(history);
    } else {
      await this.taskHistoryRepository.save(history);
    }
  }
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

  async assignCollaborator(taskId: number, collaboratorId: number, userId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found.');

    const collaborator = await this.userRepository.findOne({
      where: { id: collaboratorId },
      relations: ['role'],
    });

    if (!collaborator || collaborator.role?.name !== 'Collaborator') {
      throw new BadRequestException('Assigned user must be a Collaborator.');
    }

    task.assignedTo = collaborator;
    const updatedTask = await this.taskRepository.save(task);

    await this.logTaskHistory(task, userId, 'Collaborator Assigned', {
      collaboratorUsername: collaborator.username,
    });

    return updatedTask;
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

  async rejectTask(taskId: number, userId: number): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['createdBy'],
    });
    if (!task) throw new NotFoundException('Task not found');

    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Only completed tasks can be rejected');
    }

    const queryRunner = this.taskRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Log history with taskId
      await this.logTaskHistory(
        task,
        userId,
        'Task Rejected',
        {
          status: task.status,
          title: task.title, // Include title for reference
        },
        queryRunner,
      );

      // Delete task
      await queryRunner.manager.remove(task);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
  async markTaskAsCompleted(taskId: number, userId: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    if (task.isCompleted) {
      throw new BadRequestException('Task is already completed');
    }

    const oldStatus = task.status;
    task.status = TaskStatus.COMPLETED;
    task.isCompleted = true;
    await this.taskRepository.save(task);

    await this.logTaskHistory(task, userId, 'Status Changed', {
      oldStatus,
      newStatus: TaskStatus.COMPLETED,
    });
  }

  async setDeadlineAndPriority(taskId: number, body: SetDeadlinePriorityDto, userId: number): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const { dueDate, priority } = body;

    if (
      dueDate &&
      ((typeof dueDate === 'string' && isNaN(Date.parse(dueDate))) ||
        (dueDate instanceof Date && isNaN(dueDate.getTime())))
    ) {
      throw new BadRequestException('Invalid due date format');
    }

    const oldDueDate = task.dueDate?.toISOString();
    const oldPriority = task.priority;

    task.dueDate = dueDate ? new Date(dueDate) : undefined; // Use undefined instead of null
    task.priority = priority || task.priority;
    await this.taskRepository.save(task);

    await this.logTaskHistory(task, userId, 'Deadline and Priority Updated', {
      oldDueDate,
      newDueDate: task.dueDate?.toISOString(),
      oldPriority,
      newPriority: task.priority,
    });
  }

  async createTaskComment(taskId: number, userId: number, content: string): Promise<TaskCommentDto> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['assignedTo'],
    });
    if (!task) throw new NotFoundException('Task not found');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isManager = user.role.name === 'Manager';
    const isAssigned = user.id === task.assignedTo?.id;

    if (!isManager && !isAssigned) {
      throw new ForbiddenException('Only managers or assigned users can comment.');
    }

    const mentionUsernames = content.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
    const mentionedUsers = mentionUsernames.length > 0
      ? await this.userRepository.find({
          where: mentionUsernames.map(username => ({ username, role: { name: 'Collaborator' } })),
          relations: ['role'],
          select: ['id', 'username'],
        })
      : [];

    if (mentionedUsers.length < mentionUsernames.length) {
      const invalidUsernames = mentionUsernames.filter(
        name => !mentionedUsers.some(u => u.username === name),
      );
      throw new BadRequestException(`Invalid or unauthorized mentions: ${invalidUsernames.join(', ')}`);
    }

    const comment = this.commentRepository.create({
      task,
      author: user,
      content,
      mentions: mentionedUsers.map(u => u.id),
    });

    const savedComment = await this.commentRepository.save(comment);

    await this.logTaskHistory(task, userId, 'Comment Added', {
      commentId: savedComment.id,
      content: savedComment.content,
      authorUsername: user.username,
    });

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
    if (!task) throw new NotFoundException('Task not found');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role.name !== 'Manager' && user.id !== task.assignedTo?.id) {
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

    await this.logTaskHistory(task, userId, 'Attachment Uploaded', {
      attachmentId: savedAttachment.id,
      fileName: savedAttachment.fileName,
      uploaderUsername: user.username,
    });

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

  async markNotificationAsRead(notificationId: number, userId: number): Promise<void> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId, recipient: { id: userId } },
    });
    if (!notification) throw new NotFoundException('Notification not found or not authorized');

    notification.isRead = true;
    await this.notificationRepository.save(notification);
  }

  async getTaskHistory(taskId: number, userId: number): Promise<TaskHistoryDto[]> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['assignedTo'],
    });

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (user.role.name !== 'Manager' && user.id !== task?.assignedTo?.id) {
      throw new ForbiddenException('Only managers or assigned users can view task history');
    }

    const history = await this.taskHistoryRepository.find({
      where: { taskId },
      relations: ['changedBy'],
      order: { timestamp: 'DESC' },
    });

    return history.map(entry => ({
      id: entry.id,
      taskId: entry.taskId,
      changedByUsername: entry.changedBy?.username || 'Unknown',
      action: entry.action,
      details: entry.details,
      timestamp: entry.timestamp,
    }));
  }

  async createTimeLog(taskId: number, userId: number, timeLogDto: CreateTimeLogDto): Promise<TimeLogDto> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['assignedTo'],
    });
    if (!task) throw new NotFoundException('Task not found');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isManager = user.role.name === 'Manager';
    const isAssigned = user.id === task.assignedTo?.id;

    if (!isManager && !isAssigned) {
      throw new ForbiddenException('Only managers or assigned users can log time.');
    }

    if (timeLogDto.hours <= 0) {
      throw new BadRequestException('Hours must be greater than zero.');
    }

    const timeLog = this.timeLogRepository.create({
      task,
      taskId,
      loggedBy: user,
      hours: timeLogDto.hours,
      description: timeLogDto.description,
    });

    const savedTimeLog = await this.timeLogRepository.save(timeLog);

    await this.logTaskHistory(task, userId, 'Time Logged', {
      timeLogId: savedTimeLog.id,
      hours: savedTimeLog.hours,
      loggedByUsername: user.username,
      description: savedTimeLog.description,
    });

    return {
      id: savedTimeLog.id,
      taskId: savedTimeLog.taskId,
      loggedByUsername: user.username,
      hours: savedTimeLog.hours,
      description: savedTimeLog.description,
      createdAt: savedTimeLog.createdAt,
    };
  }

  async getTimeLogs(taskId: number, userId: number): Promise<TimeLogDto[]> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['assignedTo'],
    });
    if (!task) throw new NotFoundException('Task not found');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isManager = user.role.name === 'Manager';
    const isAssigned = user.id === task.assignedTo?.id;

    if (!isManager && !isAssigned) {
      throw new ForbiddenException('Only managers or assigned users can view time logs.');
    }

    const timeLogs = await this.timeLogRepository.find({
      where: { taskId },
      relations: ['loggedBy'],
      order: { createdAt: 'DESC' },
    });

    return timeLogs.map(log => ({
      id: log.id,
      taskId: log.taskId,
      loggedByUsername: log.loggedBy.username,
      hours: log.hours,
      description: log.description,
      createdAt: log.createdAt,
    }));
  }
}