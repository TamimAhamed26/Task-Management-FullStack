import { Injectable, NotFoundException, BadRequestException,ValidationPipe } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { PriorityLevel, Task, TaskStatus } from '../entities/task.entity';
import { User } from '../entities/user.entity';
import { TaskDto } from './dto/task.dto';
import { SetDeadlinePriorityDto } from './dto/set-deadline-priority.dto';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

async getTaskById(taskId: number): Promise<TaskDto> {
  const task = await this.taskRepository.findOne({
    where: { id: taskId },
    relations: ['createdBy', 'assignedTo', 'approvedBy'],
  });
  if (!task) {
    throw new NotFoundException('Task not found.');
  }
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

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

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
      createdByUsername: task.createdBy?.username || "",
      assignedToUsername: task.assignedTo?.username || "",
      approvedByUsername: task.approvedBy?.username || "",
      isCompleted: task.isCompleted,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }));
  }


  async getTasksSortedByPriority(): Promise<Task[]> {
    const tasks = await this.taskRepository.find({
      relations: ['createdBy', 'assignedTo', 'approvedBy'],
    });
  
    tasks.sort((a, b) => {
      const priorityOrder = { HIGH: 1, MEDIUM: 2, LOW: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  
    return tasks;
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
  
    if (!task) {
      throw new NotFoundException('Task not found.');
    }
  
    if (task.status !== TaskStatus.COMPLETED) {
      throw new BadRequestException('Only COMPLETED tasks can be deleted.');
    }
  
    await this.taskRepository.remove(task);
  }

  async markTaskAsCompleted(taskId: number): Promise<Task> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
  
    if (!task) {
      throw new NotFoundException('Task not found.');
    }
  
    if (task.status === TaskStatus.COMPLETED && task.isCompleted) {
      throw new BadRequestException('Task is already marked as completed.');
    }
  
    task.status = TaskStatus.COMPLETED;
    task.isCompleted = true;
  
    return this.taskRepository.save(task);
  }
  async setDeadlineAndPriority(
    taskId: number,
    updates: SetDeadlinePriorityDto,
  ): Promise<void> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
  
    if (!task) {
      throw new NotFoundException('Task not found.');
    }
  
    if (task.status === TaskStatus.COMPLETED) {
      throw new BadRequestException('Cannot change the deadline for a completed task.');
    }
  
    if (updates.dueDate && new Date(updates.dueDate) < new Date()) {
      throw new BadRequestException('Due date cannot be in the past.');
    }
  
    if (updates.priority && !Object.values(PriorityLevel).includes(updates.priority)) {
      throw new BadRequestException('Invalid priority level. Must be HIGH, MEDIUM, or LOW.');
    }
  
    if (updates.dueDate) {
      task.dueDate = new Date(updates.dueDate);
    }
  
    task.priority = updates.priority;
  
    await this.taskRepository.save(task);
  }
  

  
}
