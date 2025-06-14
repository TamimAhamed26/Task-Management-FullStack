import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, LessThan, QueryRunner, Repository } from 'typeorm';
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
import { SearchTaskDto } from './dto/search-task.dto';
import { ManagerOverviewDto, OverdueTaskDto, ProjectDto, TaskPrioritySummaryDto, TaskStatusSummary } from './dto/ManagerReporting.dto';
import { Project } from 'src/entities/project.entity';
import { Team } from 'src/entities/team.entity';
import { CreateTaskDto,TaskPriority } from './dto/createtaskdto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import PDFDocument from 'pdfkit';
import axios from 'axios';

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
      @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
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
async createTask(createTaskDto: CreateTaskDto, userId: number): Promise<TaskDto> {
  // Validate user is a Manager
  const user = await this.userRepository.findOne({
    where: { id: userId },
    relations: ['role'],
  });
  if (!user || user.role.name !== 'Manager') {
    throw new ForbiddenException('Only Managers can create tasks');
  }

  const { title, description, deadline, priority, assignedToId, parentTaskId, projectId } = createTaskDto;

  // Validate assignedToId is a Collaborator, if provided
  if (assignedToId) {
    const assignee = await this.userRepository.findOne({
      where: { id: assignedToId },
      relations: ['role'],
    });
    if (!assignee || assignee.role.name !== 'Collaborator') {
      throw new BadRequestException('Assigned user must be a Collaborator');
    }
  }

  // Validate parentTaskId, if provided
  if (parentTaskId) {
    const parentTask = await this.taskRepository.findOne({ where: { id: parentTaskId } });
    if (!parentTask) {
      throw new NotFoundException('Parent task not found');
    }
  }

  // Validate projectId
  const project = await this.projectRepository.findOne({ where: { id: projectId } });
  if (!project) {
    throw new NotFoundException('Project not found');
  }

  // Map TaskPriority to PriorityLevel
  const priorityMap: { [key in TaskPriority]: PriorityLevel } = {
    [TaskPriority.LOW]: PriorityLevel.LOW,
    [TaskPriority.MEDIUM]: PriorityLevel.MEDIUM,
    [TaskPriority.HIGH]: PriorityLevel.HIGH,
    [TaskPriority.URGENT]: PriorityLevel.HIGH, // Map URGENT to HIGH
  };

  const task = this.taskRepository.create({
    title,
    description,
    status: TaskStatus.PENDING,
    priority: priority ? priorityMap[priority] : PriorityLevel.MEDIUM,
    dueDate: deadline ? new Date(deadline) : undefined,
    createdBy: user,
    assignedTo: assignedToId ? { id: assignedToId } : undefined,
    approvedBy: null,
    project: { id: projectId },
    projectId,
    isCompleted: false,
  });

  const savedTask: Task = await this.taskRepository.save(task);

  // Log task creation in history
  await this.logTaskHistory(savedTask, userId, 'Task Created', {
    title: savedTask.title,
    assignedToId: savedTask.assignedTo?.id,
    projectId: savedTask.projectId,
  });

  // Create notification for assignee, if assigned
  if (assignedToId) {
    const notification = this.notificationRepository.create({
      notificationType: 'TASK_ASSIGNED',
      message: `You were assigned to task: ${savedTask.title}`,
      recipient: { id: assignedToId },
      relatedTaskId: savedTask.id,
      task: savedTask,
    });
    await this.notificationRepository.save(notification);
  }

  return {
    id: savedTask.id,
    title: savedTask.title,
    description: savedTask.description || '',
    status: savedTask.status,
    priority: savedTask.priority,
    category: savedTask.category || '',
    dueDate: savedTask.dueDate,
    createdByUsername: savedTask.createdBy.username,
    assignedToUsername: savedTask.assignedTo?.username || '',
    approvedByUsername: savedTask.approvedBy?.username || '',
    isCompleted: savedTask.isCompleted,
    createdAt: savedTask.createdAt,
    updatedAt: savedTask.updatedAt,
  };
}

  async updateTaskStatus(
    taskId: number,
    updateTaskStatusDto: UpdateTaskStatusDto,
    userId: number,
  ): Promise<TaskDto> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['createdBy', 'assignedTo', 'approvedBy'],
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newStatus: TaskStatus = updateTaskStatusDto.status;

    // Only Managers can set APPROVED or COMPLETED status
    if (
      (newStatus === TaskStatus.APPROVED || newStatus === TaskStatus.COMPLETED) &&
      user.role.name !== 'Manager'
    ) {
      throw new ForbiddenException('Only Managers can approve or complete tasks');
    }

    // Ensure task is in PENDING_APPROVAL before transitioning to APPROVED/COMPLETED
    if (newStatus === TaskStatus.APPROVED && task.status !== TaskStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Task must be in PENDING_APPROVAL to be approved');
    }

    const oldStatus: TaskStatus = task.status;

    // Update status: If APPROVED is requested, set to COMPLETED
    task.status = newStatus === TaskStatus.APPROVED ? TaskStatus.COMPLETED : newStatus;

    // Manage approvedBy and isCompleted
    if (newStatus === TaskStatus.APPROVED) {
      task.approvedBy = user;
      task.isCompleted = true; // Set isCompleted to true for COMPLETED
    } else if (oldStatus === TaskStatus.COMPLETED) {
      task.approvedBy = null; // Revert approval if status changes from COMPLETED
      task.isCompleted = false; // Revert isCompleted if no longer COMPLETED
    } else {
      task.isCompleted = newStatus === TaskStatus.COMPLETED; // Handle direct COMPLETED status
    }

    const savedTask = await this.taskRepository.save(task);

    // Log status change
    await this.logTaskHistory(savedTask, userId, 'Status Changed', {
      oldStatus,
      newStatus: savedTask.status,
      approvedById: savedTask.approvedBy?.id || null,
    });

    // Notify assignee
    if (task.assignedTo) {
      const notification = this.notificationRepository.create({
        notificationType: 'STATUS_UPDATED',
        message: `Task "${savedTask.title}" status updated to ${savedTask.status}`,
        recipient: { id: task.assignedTo.id },
        relatedTaskId: savedTask.id,
        task: savedTask,
      });
      await this.notificationRepository.save(notification);
    }

    return {
      id: savedTask.id,
      title: savedTask.title,
      description: savedTask.description || '',
      status: savedTask.status,
      priority: savedTask.priority,
      category: savedTask.category || '',
      dueDate: savedTask.dueDate,
      createdByUsername: savedTask.createdBy?.username || '',
      assignedToUsername: savedTask.assignedTo?.username || '',
      approvedByUsername: savedTask.approvedBy?.username || '',
      isCompleted: savedTask.isCompleted,
      createdAt: savedTask.createdAt,
      updatedAt: savedTask.updatedAt,
    };
  }

  
 async getRecentTasks(userId: number, projectId?: number): Promise<TaskDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const whereClause: any = user.role.name === 'Manager' ? {} : { assignedTo: { id: userId } };
    if (projectId) {
      whereClause.projectId = projectId;
    }

    const tasks = await this.taskRepository.find({
      where: whereClause,
      relations: ['createdBy', 'assignedTo', 'approvedBy'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    if (projectId && tasks.length === 0) {
      const projectExists = await this.projectRepository.findOne({ where: { id: projectId } });
      if (!projectExists) {
        throw new NotFoundException('Project not found');
      }
    }

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      category: task.category || '',
      dueDate: task.dueDate,
      createdByUsername: task.createdBy?.username || '',
      assignedToUsername: task.assignedTo?.username || '',
      approvedByUsername: task.approvedBy?.username || '',
      isCompleted: task.isCompleted,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
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

async getPendingTasks(projectId?: number, projectName?: string): Promise<TaskDto[]> {
    if (projectId && projectName) {
      throw new BadRequestException('Provide either projectId or projectName, not both');
    }

    const whereClause: any = { status: TaskStatus.PENDING };

    if (projectId) {
      const project = await this.projectRepository.findOne({ where: { id: projectId } });
      if (!project) {
        throw new NotFoundException(`Project with ID ${projectId} not found`);
      }
      whereClause.projectId = projectId;
    } else if (projectName) {
      const project = await this.projectRepository.findOne({ where: { name: projectName } });
      if (!project) {
        throw new NotFoundException(`Project with name "${projectName}" not found`);
      }
      whereClause.projectId = project.id;
    }

    const tasks = await this.taskRepository.find({
      where: whereClause,
      relations: ['createdBy', 'assignedTo', 'approvedBy', 'project'],
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      category: task.category || '',
      dueDate: task.dueDate,
      createdByUsername: task.createdBy?.username || '',
      assignedToUsername: task.assignedTo?.username || '',
      approvedByUsername: task.approvedBy?.username || '',
      isCompleted: task.isCompleted,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      projectId: task.project?.id,
      projectName: task.project?.name,
    }));
  }
  async getTasksSortedByPriority(): Promise<Task[]> {
    const tasks = await this.taskRepository.find({
      relations: ['createdBy', 'assignedTo', 'approvedBy'],
    });

    const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
    return tasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }


  async searchTasks(filters: SearchTaskDto): Promise<TaskDto[]> {
    const {
      keyword,
      status,
      priority,
      category,
      dueBefore,
      assignedToUsername,
      assignedToId,
    } = filters;

    const query = this.taskRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.createdBy', 'createdBy')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .leftJoinAndSelect('task.approvedBy', 'approvedBy');

    if (keyword) {
      query.andWhere(
        '(task.title ILIKE :keyword OR task.description ILIKE :keyword)',
        { keyword: `%${keyword}%` },
      );
    }

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    if (category) {
      query.andWhere('task.category = :category', { category });
    }

    if (dueBefore) {
      if (isNaN(Date.parse(dueBefore))) {
        throw new BadRequestException('Invalid dueBefore date format. Use YYYY-MM-DD.');
      }
      const dueBeforeAdjusted = new Date(dueBefore);
      dueBeforeAdjusted.setHours(23, 59, 59, 999);
      query.andWhere('task.dueDate <= :dueBefore', {
        dueBefore: dueBeforeAdjusted.toISOString(),
      });
    }

    if (assignedToUsername && assignedToId) {
      throw new BadRequestException('Provide either assignedToUsername or assignedToId, not both.');
    }

    if (assignedToUsername) {
      query.andWhere('assignedTo.username = :assignedToUsername', { assignedToUsername });
    } else if (assignedToId) {
      const assignedToIdNum = parseInt(assignedToId, 10);
      if (isNaN(assignedToIdNum)) {
        throw new BadRequestException('Invalid assignedToId format.');
      }
      query.andWhere('assignedTo.id = :assignedToId', { assignedToId: assignedToIdNum });
    }

    const tasks = await query.getMany();

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

  async rejectTask(taskId: number, userId: number): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['createdBy'],
    });
    if (!task) throw new NotFoundException('Task not found');

    if (task.status !== TaskStatus.COMPLETED && task.status !== TaskStatus.PENDING_APPROVAL) {
      throw new BadRequestException('Only completed or pending approval tasks can be rejected');
    }

    const queryRunner = this.taskRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await this.logTaskHistory(
        task,
        userId,
        'Task Rejected',
        {
          status: task.status,
          title: task.title,
        },
        queryRunner,
      );

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
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['assignedTo', 'createdBy'],
    });
    if (!task) throw new NotFoundException('Task not found');

    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user) throw new NotFoundException('User not found');

    // Only assigned Collaborators or Managers can mark as completed
    const isManager = user.role.name === 'Manager';
    const isAssigned = user.id === task.assignedTo?.id;
    if (!isManager && !isAssigned) {
      throw new ForbiddenException('Only Managers or assigned Collaborators can mark tasks as completed');
    }

    if (task.isCompleted) {
      throw new BadRequestException('Task is already completed');
    }

    const oldStatus = task.status;

    // Set status based on user role
    task.status = isManager ? TaskStatus.COMPLETED : TaskStatus.PENDING_APPROVAL;
    task.isCompleted = isManager; // Only set isCompleted for Managers

    await this.taskRepository.save(task);

    await this.logTaskHistory(task, userId, 'Task Marked as Completed', {
      oldStatus,
      newStatus: task.status,
    });

    // Notify Manager if Collaborator marked the task
    if (!isManager && task.createdBy) {
      const notification = this.notificationRepository.create({
        notificationType: 'TASK_PENDING_APPROVAL',
        message: `Task "${task.title}" is pending approval`,
        recipient: { id: task.createdBy.id },
        relatedTaskId: task.id,
        task,
      });
      await this.notificationRepository.save(notification);
    }
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

  async getManagerOverview(userId: number): Promise<ManagerOverviewDto> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user || user.role.name !== 'Manager') {
      throw new ForbiddenException('Only managers can access this overview.');
    }

    // Total tasks
    const totalTasks = await this.taskRepository.count();

    // Tasks by status
    const statusSummary: TaskStatusSummary[] = [];
    for (const status of Object.values(TaskStatus)) {
      const count = await this.taskRepository.count({ where: { status } });
      statusSummary.push({ status, count });
    }

    // Tasks by assignee
    const assigneeSummary = await this.taskRepository
      .createQueryBuilder('task')
      .leftJoin('task.assignedTo', 'user')
      .select('user.username', 'username')
      .addSelect('COUNT(task.id)', 'taskCount')
      .where('task.assignedTo IS NOT NULL')
      .groupBy('user.username')
      .orderBy('COUNT(task.id)', 'DESC')
      .getRawMany();

    return {
      totalTasks,
      statusSummary,
      assigneeSummary: assigneeSummary.map(row => ({
        username: row.username || 'Unassigned',
        taskCount: parseInt(row.taskCount, 10),
      })),
    };
  }

  async getOverdueTasks(userId: number): Promise<OverdueTaskDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
    if (!user || user.role.name !== 'Manager') {
      throw new ForbiddenException('Only managers can access overdue tasks.');
    }

    const currentDate = new Date('2025-06-11T19:29:00+06:00'); // Current date/time in +06 timezone
    const tasks = await this.taskRepository.find({
      where: {
        dueDate: LessThan(currentDate),
        isCompleted: false,
      },
      relations: ['assignedTo'],
      order: { dueDate: 'ASC' },
    });

    return tasks.map(task => ({
      id: task.id,
      title: task.title,
      assigneeUsername: task.assignedTo?.username || 'Unassigned',
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
    }));
  }
 async createTaskComment(taskId: number, userId: number, content: string, parentCommentId?: number): Promise<TaskCommentDto> {
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

    if (parentCommentId) {
      const parentComment = await this.commentRepository.findOne({
        where: { id: parentCommentId, task: { id: taskId } },
      });
      if (!parentComment) throw new NotFoundException('Parent comment not found');
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
      parentCommentId,
    });

    const savedComment = await this.commentRepository.save(comment);

    // Create notification for mentioned users and task assignee
    if (mentionedUsers.length > 0 || task.assignedTo) {
      const recipients = new Set([...mentionedUsers.map(u => u.id), task.assignedTo?.id].filter(id => id && id !== userId));
      for (const recipientId of recipients) {
        const notification = this.notificationRepository.create({
          notificationType: 'COMMENT',
          message: `${user.username} commented on task: ${task.title}`,
          recipient: { id: recipientId },
          relatedTaskId: task.id,
          task,
        });
        await this.notificationRepository.save(notification);
      }
    }

    await this.logTaskHistory(task, userId, 'Comment Added', {
      commentId: savedComment.id,
      content: savedComment.content,
      authorUsername: user.username,
      parentCommentId: savedComment.parentCommentId,
    });

    return {
      id: savedComment.id,
      taskId: savedComment.task.id,
      authorUsername: savedComment.author.username,
      content: savedComment.content,
      mentions: savedComment.mentions,
      createdAt: savedComment.createdAt,
      parentCommentId: savedComment.parentCommentId,
    };
  }

  async getTaskComments(taskId: number): Promise<TaskCommentDto[]> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found.');

    const comments = await this.commentRepository.find({
      where: { task: { id: taskId } },
      relations: ['task', 'author', 'parentComment'],
      order: { createdAt: 'ASC' },
    });

    // Build threaded comment structure
    const commentMap = new Map<number, TaskCommentDto>();
    const threadedComments: TaskCommentDto[] = [];

    for (const comment of comments) {
      const commentDto: TaskCommentDto = {
        id: comment.id,
        taskId: comment.task.id,
        authorUsername: comment.author.username,
        content: comment.content,
        mentions: comment.mentions,
        createdAt: comment.createdAt,
        parentCommentId: comment.parentCommentId,
        children: [], // Initialize children array
      };
      commentMap.set(comment.id, commentDto);

      if (!comment.parentCommentId) {
        threadedComments.push(commentDto);
      } else {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.children = parent.children ? [...parent.children, commentDto] : [commentDto];
        }
      }
    }

    return threadedComments;
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
      notificationType: n.notificationType,
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



async getTaskPrioritySummary(projectId?: number): Promise<TaskPrioritySummaryDto[]> {
  const query = this.taskRepository
    .createQueryBuilder('task')
    .select('task.priority', 'priority')
    .addSelect('COUNT(task.id)', 'count');

  if (projectId) {
    query.where('task.projectId = :projectId', { projectId });
  }

  const prioritySummary = await query
    .groupBy('task.priority')
    .getRawMany();

  return prioritySummary.map(row => ({
    priority: row.priority,
    count: parseInt(row.count, 10),
  }));
}
  
  async getProjects(userId: number): Promise<ProjectDto[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'teams'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isManager = user.role.name === 'Manager';
    const isCollaborator = user.role.name === 'Collaborator';
    if (!isManager && !isCollaborator) {
      throw new ForbiddenException('Only managers or collaborators can view projects');
    }

    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.team', 'team')
      .leftJoinAndSelect('team.members', 'members')
      .leftJoinAndSelect('project.owner', 'owner')
      .where('members.id = :userId OR project.ownerId = :userId', { userId })
      .getMany();

    return projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description || '',
      ownerUsername: project.owner.username,
      teamMembers: project.team?.members.map(member => member.username) || [],
    }));
  }

  async getProjectTasks(projectId: number, userId: number, page: number = 1, limit: number = 10): Promise<{ data: TaskDto[]; total: number; page: number; limit: number }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role', 'teams'],
    });
    if (!user) throw new NotFoundException('User not found');

    const isManager = user.role.name === 'Manager';
    const isCollaborator = user.role.name === 'Collaborator';
    if (!isManager && !isCollaborator) {
      throw new ForbiddenException('Only managers or collaborators can view project tasks');
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['team', 'team.members'],
    });
    if (!project) throw new NotFoundException('Project not found');

    const isMember = project.team?.members.some(member => member.id === userId) || project.ownerId === userId;
    if (!isManager && !isMember) {
      throw new ForbiddenException('User is not a member of this project');
    }

    const [tasks, total] = await this.taskRepository.findAndCount({
      where: { projectId },
      relations: ['createdBy', 'assignedTo', 'approvedBy'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        status: task.status,
        priority: task.priority,
        category: task.category || '',
        dueDate: task.dueDate,
        createdByUsername: task.createdBy?.username || '',
        assignedToUsername: task.assignedTo?.username || '',
        approvedByUsername: task.approvedBy?.username || '',
        isCompleted: task.isCompleted,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
      })),
      total,
      page,
      limit,
    };
  }


  
  async addTeamMember(projectId: number, currentUserId: number, memberId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: currentUserId },
      relations: ['role'],
    });
    if (!user || user.role.name !== 'Manager') {
      throw new ForbiddenException('Only managers can add team members');
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['team', 'team.members'],
    });
    if (!project) throw new NotFoundException('Project not found');

    if (!project.team) {
      throw new BadRequestException('Project has no associated team. Please create a team first.');
    }

    const member = await this.userRepository.findOne({
      where: { id: memberId },
      relations: ['role'],
    });
    if (!member || member.role.name !== 'Collaborator') {
      throw new BadRequestException('Member must be a Collaborator');
    }

    if (project.team.members.some(m => m.id === memberId)) {
      throw new BadRequestException('User is already a team member');
    }

    project.team.members.push(member);
    await this.teamRepository.save(project.team);

    const notification = this.notificationRepository.create({
      notificationType: 'TEAM_ADDED',
      message: `You were added to project: ${project.name}`,
      isRead: false,
      recipient: { id: memberId },
      relatedTaskId: undefined,
      task: undefined,
      createdAt: new Date(),
    });
    await this.notificationRepository.save(notification);

    // Optionally, fetch the member's username for a success message
    const memberName = member.username || `ID ${memberId}`;
    console.log(`${memberName} added to team for project: ${project.name}`);
  }

  async removeTeamMember(projectId: number, currentUserId: number, memberId: number): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: currentUserId },
      relations: ['role'],
    });
    if (!user || user.role.name !== 'Manager') {
      throw new ForbiddenException('Only managers can remove team members');
    }

    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['team', 'team.members'],
    });
    if (!project) throw new NotFoundException('Project not found');

    if (!project.team) {
      throw new BadRequestException('Project has no associated team.');
    }

    const member = await this.userRepository.findOne({
      where: { id: memberId },
      relations: ['role'],
    });
    if (!member) throw new NotFoundException('Member not found');

    if (!project.team.members.some(m => m.id === memberId)) {
      throw new BadRequestException('User is not a team member');
    }

    project.team.members = project.team.members.filter(m => m.id !== memberId);
    await this.teamRepository.save(project.team);

    const notification = this.notificationRepository.create({
      notificationType: 'TEAM_REMOVED',
      message: `You were removed from project: ${project.name}`,
      isRead: false,
      recipient: { id: memberId },
      relatedTaskId: undefined,
      task: undefined,
      createdAt: new Date(),
    });
    await this.notificationRepository.save(notification);
  }



 
}