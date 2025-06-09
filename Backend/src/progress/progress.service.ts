import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
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


  @Injectable()
  export class ProgressService {
    constructor(
      @InjectRepository(Task)
      private taskRepository: Repository<Task>,
  
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
  
    const filename = await this.fileService.uploadFile(file);
  
    const downloadLink = `http://localhost:3000/progress/download/${filename}`;
  
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
  
}
