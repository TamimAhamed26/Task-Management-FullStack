import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Task, TaskStatus } from '../entities/task.entity'; 
import { Repository, Between } from 'typeorm';
import { ProgressReportDto } from './dto/ProgressReportDto';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import axios from 'axios';
import { UserService } from 'src/user/user.service';
import { FileService } from 'src/file/file.service';
import { EmailService } from 'src/email/email.service';
import * as path from 'path';
import { AverageCompletionTimeDto, TaskCompletionRateDto, TotalHoursPerTaskDto, TotalHoursPerUserDto, WorkloadDistributionDto } from './dto/progress.dto';
import { TimeLog } from 'src/entities/time-log.entity';


  @Injectable()
  export class ProgressService {
    constructor(
      @InjectRepository(Task)
      private taskRepository: Repository<Task>,
      @InjectRepository(TimeLog)
      private timeLogRepository: Repository<TimeLog>,
      private readonly userService: UserService,
      private readonly fileService: FileService,
      private readonly emailService: EmailService,
    ) {}
  

  async generateWeeklyReport(): Promise<ProgressReportDto> {
    const today = new Date();
    const lastWeek = new Date();
    lastWeek.setDate(today.getDate() - 7);

    const tasks = await this.taskRepository.find({
      where: { createdAt: Between(lastWeek, today) },
    });

    const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const pendingTasks = tasks.length - completedTasks;
    const completionPercentage = tasks.length === 0 ? 0 : (completedTasks / tasks.length) * 100;

    const graphData: { date: string; completed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      const dayStr = day.toISOString().split('T')[0];

      const completedOnDay = tasks.filter(task =>
        task.status === TaskStatus.COMPLETED &&
        task.updatedAt.toISOString().split('T')[0] === dayStr
      ).length;

      graphData.push({ date: dayStr, completed: completedOnDay });
    }

    return {
      completedTasks,
      pendingTasks,
      completionPercentage: Number(completionPercentage.toFixed(2)),
      weeklyGraphData: graphData,
    };
  }

  async generateMonthlyReport(): Promise<ProgressReportDto> {
    const today = new Date();
    const lastMonth = new Date();
    lastMonth.setMonth(today.getMonth() - 1);
  
    const tasks = await this.taskRepository.find({
      where: { createdAt: Between(lastMonth, today) },
    });
  
    const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED).length;
    const pendingTasks = tasks.length - completedTasks;
    const completionPercentage = tasks.length === 0 ? 0 : (completedTasks / tasks.length) * 100;
  
    const graphData: { date: string; completed: number }[] = [];
  
    // Loop for 30 days
    for (let i = 29; i >= 0; i--) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      const dayStr = day.toISOString().split('T')[0];
  
      const completedOnDay = tasks.filter(task =>
        task.status === TaskStatus.COMPLETED &&
        task.updatedAt.toISOString().split('T')[0] === dayStr
      ).length;
  
      graphData.push({ date: dayStr, completed: completedOnDay });
    }
  
    return {
      completedTasks,
      pendingTasks,
      completionPercentage: Number(completionPercentage.toFixed(2)),
      weeklyGraphData: graphData, 
    };
  }

  async searchTasksByDate(
    startDate: string,
    endDate: string,
    sort: 'ASC' | 'DESC',
    page = 1,
    limit = 10,
  ): Promise<{ data: Task[]; total: number; page: number; limit: number }> {
    const start = new Date(startDate);
    const end = new Date(endDate);
  
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO format (YYYY-MM-DD).');
    }
  
    if (start > end) {
      throw new BadRequestException('Start date must be before end date.');
    }
  
    const [tasks, total] = await this.taskRepository.findAndCount({
      where: {
        createdAt: Between(start, end),
      },
      order: {
        createdAt: sort,
      },
      skip: (page - 1) * limit,
      take: limit,
    });
  
    return {
      data: tasks,
      total,
      page,
      limit,
    };
  }
  
  async uploadReportFileAndNotifyManager(
    file: Express.Multer.File,
    uploaderEmail: string,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
  
    if (!uploaderEmail) {
      throw new BadRequestException('Uploader email is required');
    }
  
    const adminUser = await this.userService.findByEmail(uploaderEmail);
  
    if (!adminUser || adminUser.role.name !== 'Admin') {
      throw new ForbiddenException('Email must belong to an Admin user');
    }
  
const { fileUrl } = await this.fileService.uploadFile(file);
const filename = path.basename(fileUrl);
const downloadLink = `http://localhost:3001/progress/download/${filename}`;

await this.emailService.sendFileUploadConfirmation(adminUser.email, filename, downloadLink);

    return `File uploaded successfully as '${filename}'. Admin notified with download link.`;
  }
  
async generateWeeklyReportPDF(): Promise<Buffer> {
  const report = await this.generateWeeklyReport();

  const doc = new PDFDocument();
  const buffers: Uint8Array[] = [];

  doc.on('data', buffers.push.bind(buffers));
  doc.on('end', () => {});

  doc.fontSize(18).text('Weekly Report', { align: 'center' });
  doc.moveDown();

  doc.fontSize(12).text(`Completed Tasks: ${report.completedTasks}`);
  doc.text(`Pending Tasks: ${report.pendingTasks}`);
  doc.text(`Completion Percentage: ${report.completionPercentage}%`);
  doc.moveDown();


  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify({
    type: 'bar',
    data: {
      labels: report.weeklyGraphData.map(d => d.date),
      datasets: [{
        label: 'Completed Tasks',
        data: report.weeklyGraphData.map(d => d.completed),
        backgroundColor: 'blue'
      }]
    }
  }))}`;

  const response = await axios.get(chartUrl, { responseType: 'arraybuffer' });
  const chartImage = Buffer.from(response.data as ArrayBuffer);

  // Add Graph
  doc.image(chartImage, {
    fit: [500, 300],
    align: 'center',
    valign: 'center'
  });

  doc.end();

  const finalBuffer = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });

  return finalBuffer;
}
 async getTaskCompletionRate(
    startDate?: string,
    endDate?: string,
    username?: string,
    userId?: number,
  ): Promise<TaskCompletionRateDto> {
    const query = this.taskRepository.createQueryBuilder('task')
      .leftJoin('task.assignedTo', 'user');

    if (startDate && endDate) {
      if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
      }
      const endDateAdjusted = new Date(endDate);
      endDateAdjusted.setHours(23, 59, 59, 999);
      query.where('task.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endDateAdjusted.toISOString(),
      });
    }

    if (username && userId) {
      throw new BadRequestException('Provide either username or userId, not both.');
    }

    if (username) {
      query.andWhere('user.username = :username', { username });
    } else if (userId) {
      query.andWhere('user.id = :userId', { userId });
    }

    const totalTasks = await query.getCount();
    const completedTasks = await query
      .andWhere('task.status = :status', { status: TaskStatus.COMPLETED })
      .getCount();

    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    return {
      completionRate: parseFloat(completionRate.toFixed(2)),
      completedTasks,
      totalTasks,
    };
  }

  async getAverageCompletionTime(
    startDate?: string,
    endDate?: string,
    username?: string,
    userId?: number,
  ): Promise<AverageCompletionTimeDto> {
    const query = this.taskRepository.createQueryBuilder('task')
      .select('AVG(EXTRACT(EPOCH FROM (task.updatedAt - task.createdAt)) / 86400)', 'averageDays')
      .leftJoin('task.assignedTo', 'user')
      .where('task.status = :status', { status: TaskStatus.COMPLETED });

    if (startDate && endDate) {
      if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
      }
      const endDateAdjusted = new Date(endDate);
      endDateAdjusted.setHours(23, 59, 59, 999);
      query.andWhere('task.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endDateAdjusted.toISOString(),
      });
    }

    if (username && userId) {
      throw new BadRequestException('Provide either username or userId, not both.');
    }

    if (username) {
      query.andWhere('user.username = :username', { username });
    } else if (userId) {
      query.andWhere('user.id = :userId', { userId });
    }

    const result = await query.getRawOne();
    const averageDays = result.averageDays ? parseFloat(result.averageDays) : 0;

    return {
      averageDays: parseFloat(averageDays.toFixed(2)),
    };
  }
async getWorkloadDistribution(
  username?: string,
  userId?: number,
): Promise<WorkloadDistributionDto[]> {
  const query = this.taskRepository
    .createQueryBuilder('task')
    .leftJoin('task.assignedTo', 'user')
    .select('user.username', 'username')
    .addSelect('COUNT(task.id)', 'taskCount')
    .addSelect('SUM(CASE WHEN task.status = :pending THEN 1 ELSE 0 END)', 'pendingCount')
    .addSelect('SUM(CASE WHEN task.status = :approved THEN 1 ELSE 0 END)', 'approvedCount')
    .addSelect('SUM(CASE WHEN task.status = :completed THEN 1 ELSE 0 END)', 'completedCount')
    .addSelect('SUM(CASE WHEN task.status = :rejected THEN 1 ELSE 0 END)', 'rejectedCount')
    .where('task.assignedTo IS NOT NULL')
    .setParameters({
      pending: TaskStatus.PENDING,
      approved: TaskStatus.APPROVED,
      completed: TaskStatus.COMPLETED,
      rejected: TaskStatus.REJECTED,
    });

  if (username && userId) {
    throw new BadRequestException('Provide either username or userId, not both');
  }

  if (username) {
    query.andWhere('user.username = :username', { username });
  } else if (userId) {
    query.andWhere('user.id = :userId', { userId });
  }

  const result = await query
    .groupBy('user.username')
    .orderBy('COUNT(task.id)', 'DESC')
    .getRawMany();

  if (result.length === 0) {
    if (username || userId) {
      throw new NotFoundException('No tasks found for the specified collaborator');
    }
    return [];
  }

  return result.map(row => ({
    username: row.username || 'Unassigned',
    taskCount: parseInt(row.taskCount, 10),
    statusBreakdown: {
      [TaskStatus.PENDING]: parseInt(row.pendingCount, 10),
      [TaskStatus.APPROVED]: parseInt(row.approvedCount, 10),
      [TaskStatus.COMPLETED]: parseInt(row.completedCount, 10),
      [TaskStatus.REJECTED]: parseInt(row.rejectedCount, 10),
    },
  }));
}

  async getTotalHoursPerTask(taskId: number): Promise<TotalHoursPerTaskDto> {
    const task = await this.taskRepository.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');

    const result = await this.timeLogRepository
      .createQueryBuilder('timeLog')
      .select('SUM(timeLog.hours)', 'totalHours')
      .where('timeLog.taskId = :taskId', { taskId })
      .getRawOne();

    const totalHours = result.totalHours ? parseFloat(result.totalHours) : 0;

    return {
      taskId,
      title: task.title,
      totalHours: parseFloat(totalHours.toFixed(2)),
    };
  }

  async getTotalHoursPerUser(
    username?: string,
    userId?: number,
    startDate?: string,
    endDate?: string,
  ): Promise<TotalHoursPerUserDto[]> {
    const query = this.timeLogRepository
      .createQueryBuilder('timeLog')
      .leftJoin('timeLog.loggedBy', 'user')
      .select('user.username', 'username')
      .addSelect('SUM(timeLog.hours)', 'totalHours')
      .groupBy('user.username');

    if (username && userId) {
      throw new BadRequestException('Provide either username or userId, not both.');
    }

    if (username) {
      query.where('user.username = :username', { username });
    } else if (userId) {
      query.where('user.id = :userId', { userId });
    }

    if (startDate && endDate) {
      if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
        throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
      }
      const endDateAdjusted = new Date(endDate);
      endDateAdjusted.setHours(23, 59, 59, 999);
      query.andWhere('timeLog.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate: endDateAdjusted.toISOString(),
      });
    }

    const result = await query
      .orderBy('SUM(timeLog.hours)', 'DESC')
      .getRawMany();

    if (result.length === 0) {
      if (username || userId) {
        throw new NotFoundException('No time logs found for the specified collaborator.');
      }
      return [];
    }

    return result.map(row => ({
      username: row.username,
      totalHours: parseFloat(parseFloat(row.totalHours).toFixed(2)),
    }));
  }
}