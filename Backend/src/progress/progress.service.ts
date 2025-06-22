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
import { User } from 'src/entities/user.entity';
import { Project } from 'src/entities/project.entity';
import { Team } from 'src/entities/team.entity';


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
      @InjectRepository(Project)
      private projectRepository: Repository<Project>,
      @InjectRepository(Team)
      private teamRepository: Repository<Team>,
      @InjectRepository(User)
      private userRepository: Repository<User>,
      
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
    projectId?: number, 
    teamId?: number,    
  ): Promise<TaskCompletionRateDto> {
    const query = this.taskRepository.createQueryBuilder('task')
      .leftJoin('task.assignedTo', 'user')
      .leftJoin('task.project', 'project') 
      .leftJoin('project.teams', 'team'); 

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

    if (projectId) { // Add projectId filter
        query.andWhere('task.projectId = :projectId', { projectId });
    }

    if (teamId) { // Add teamId filter
        query.andWhere('team.id = :teamId', { teamId });
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
  requestingUserId: number,
  username?: string,
  userId?: number,
  startDate?: Date,
  endDate?: Date,
  projectId?: number,
  teamId?: number,
): Promise<WorkloadDistributionDto[]> {
  const requestingUser = await this.userRepository.findOne({
    where: { id: requestingUserId },
    relations: ['role'],
  });
  if (!requestingUser) {
    throw new NotFoundException('Requesting user not found.');
  }

  const isManager = requestingUser.role.name === 'Manager';
  const isCollaborator = requestingUser.role.name === 'Collaborator';
  if (!isManager && !isCollaborator) {
    throw new ForbiddenException('Only managers or collaborators can view workload distribution');
  }

  if (username && userId) {
    throw new BadRequestException('Provide either username or userId for filtering tasks by assignee, not both.');
  }

  let sqlQuery = `
    SELECT 
      "assignedTo"."username" AS "username",
      COUNT("task"."id") AS "taskCount",
      SUM(CASE WHEN "task"."status" = $1 THEN 1 ELSE 0 END) AS "pendingCount",
      SUM(CASE WHEN "task"."status" = $2 THEN 1 ELSE 0 END) AS "pending_approvalCount",
      SUM(CASE WHEN "task"."status" = $3 THEN 1 ELSE 0 END) AS "completedCount",
      SUM(CASE WHEN "task"."status" = $4 THEN 1 ELSE 0 END) AS "rejectedCount"
    FROM "task" 
    LEFT JOIN "user" "assignedTo" ON "assignedTo"."id" = "task"."assignedToId"
    LEFT JOIN "project" ON "project"."id" = "task"."projectId"
    LEFT JOIN "project_teams_team" "ptt" ON "ptt"."projectId" = "project"."id"
    LEFT JOIN "team" "teams" ON "teams"."id" = "ptt"."teamId"
    WHERE "assignedTo"."id" IS NOT NULL
  `;

  const parameters: any[] = [
    TaskStatus.PENDING,
    TaskStatus.PENDING_APPROVAL,
    TaskStatus.COMPLETED,
    TaskStatus.REJECTED,
  ];
  let paramIndex = 5;

  // Filters
  if (isCollaborator) {
    sqlQuery += ` AND "assignedTo"."id" = $${paramIndex}`;
    parameters.push(requestingUser.id);
    paramIndex++;

    if (username || userId) {
      throw new ForbiddenException('Collaborators can only view their own workload distribution.');
    }
  } else if (isManager) {
    if (username) {
      sqlQuery += ` AND "assignedTo"."username" = $${paramIndex}`;
      parameters.push(username);
      paramIndex++;
    } else if (userId) {
      sqlQuery += ` AND "assignedTo"."id" = $${paramIndex}`;
      parameters.push(userId);
      paramIndex++;
    }
  }

  if (startDate && endDate) {
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }

    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);

    sqlQuery += ` AND "task"."createdAt" >= $${paramIndex} AND "task"."createdAt" < $${paramIndex + 1}`;
    parameters.push(startDate.toISOString().split('T')[0]);
    parameters.push(adjustedEndDate.toISOString().split('T')[0]);
    paramIndex += 2;
  }

  if (projectId) {
    sqlQuery += ` AND "project"."id" = $${paramIndex}`;
    parameters.push(projectId);
    paramIndex++;
  }

  if (teamId) {
    sqlQuery += ` AND "teams"."id" = $${paramIndex}`;
    parameters.push(teamId);
    paramIndex++;
  } else if (isCollaborator && !projectId) {
    const collaboratorProjects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.teams', 'teams')
      .leftJoin('teams.members', 'members')
      .leftJoin('project.owner', 'owner')
      .where('members.id = :currentUserId OR owner.id = :currentUserId', {
        currentUserId: requestingUser.id,
      })
      .select('project.id')
      .getMany();

    const projectIds = collaboratorProjects.map(p => p.id);
    if (projectIds.length > 0) {
      sqlQuery += ` AND "project"."id" = ANY($${paramIndex}::int[])`;
      parameters.push(projectIds);
      paramIndex++;
    } else {
      return [];
    }
  }

  sqlQuery += ' GROUP BY "assignedTo"."id", "assignedTo"."username"';

  const result = await this.taskRepository.query(sqlQuery, parameters);

  return result.map(row => ({
    username: row.username,
    taskCount: parseInt(row.taskCount || '0', 10),
    statusBreakdown: {
      [TaskStatus.PENDING]: parseInt(row.pendingCount || '0', 10),
      [TaskStatus.PENDING_APPROVAL]: parseInt(row.pending_approvalCount || '0', 10),
      [TaskStatus.COMPLETED]: parseInt(row.completedCount || '0', 10),
      [TaskStatus.REJECTED]: parseInt(row.rejectedCount || '0', 10),
    },
  }));
}

async getTotalHoursPerUser(
  requestingUserId: number,
  username?: string,
  userId?: number,
  startDate?: Date,
  endDate?: Date,
  projectId?: number,
  teamId?: number,
): Promise<TotalHoursPerUserDto[]> {
  const requestingUser = await this.userRepository.findOne({
    where: { id: requestingUserId },
    relations: ['role'],
  });

  if (!requestingUser) {
    throw new NotFoundException('Requesting user not found.');
  }

  const isManager = requestingUser.role.name === 'Manager';
  const isCollaborator = requestingUser.role.name === 'Collaborator';

  if (!isManager && !isCollaborator) {
    throw new ForbiddenException('Only managers or collaborators can view total hours logged.');
  }

  if (username && userId) {
    throw new BadRequestException('Provide either username or userId, not both.');
  }

  let sqlQuery = `
    SELECT 
      "loggedBy"."username" AS "username",
      SUM("timeLog"."hours") AS "totalHours"
    FROM "time_log" AS "timeLog"
    LEFT JOIN "user" AS "loggedBy" ON "loggedBy"."id" = "timeLog"."loggedById"
    LEFT JOIN "task" AS "task" ON "task"."id" = "timeLog"."taskId"
    LEFT JOIN "project" AS "project" ON "project"."id" = "task"."projectId"
    LEFT JOIN "project_teams_team" AS "ptt" ON "ptt"."projectId" = "project"."id"
    LEFT JOIN "team" AS "teams" ON "teams"."id" = "ptt"."teamId"
    WHERE "loggedBy"."id" IS NOT NULL
  `;

  const parameters: any[] = [];
  let paramIndex = 1;

  if (isCollaborator) {
    sqlQuery += ` AND "loggedBy"."id" = $${paramIndex}`;
    parameters.push(requestingUser.id);
    paramIndex++;

    if (username || userId) {
      throw new ForbiddenException('Collaborators can only view their own hours.');
    }
  } else if (isManager) {
    if (username) {
      sqlQuery += ` AND "loggedBy"."username" = $${paramIndex}`;
      parameters.push(username);
      paramIndex++;
    } else if (userId) {
      sqlQuery += ` AND "loggedBy"."id" = $${paramIndex}`;
      parameters.push(userId);
      paramIndex++;
    }
  }

  if (startDate && endDate) {
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid date format.');
    }
    const adjustedEndDate = new Date(endDate);
    adjustedEndDate.setDate(adjustedEndDate.getDate() + 1);

    sqlQuery += ` AND "timeLog"."createdAt" >= $${paramIndex} AND "timeLog"."createdAt" < $${paramIndex + 1}`;
    parameters.push(startDate.toISOString().split('T')[0]);
    parameters.push(adjustedEndDate.toISOString().split('T')[0]);
    paramIndex += 2;
  }

  if (projectId) {
    sqlQuery += ` AND "project"."id" = $${paramIndex}`;
    parameters.push(projectId);
    paramIndex++;
  }

  if (teamId) {
    sqlQuery += ` AND "teams"."id" = $${paramIndex}`;
    parameters.push(teamId);
    paramIndex++;
  } else if (isCollaborator && !projectId) {
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoin('project.teams', 'teams')
      .leftJoin('teams.members', 'members')
      .leftJoin('project.owner', 'owner')
      .where('members.id = :currentUserId OR owner.id = :currentUserId', { currentUserId: requestingUser.id })
      .select('project.id')
      .getMany();

    const projectIds = projects.map(p => p.id);
    if (projectIds.length > 0) {
      sqlQuery += ` AND "project"."id" = ANY($${paramIndex}::int[])`;
      parameters.push(projectIds);
      paramIndex++;
    } else {
      return [];
    }
  }

  sqlQuery += ' GROUP BY "loggedBy"."id", "loggedBy"."username"';

  const result = await this.timeLogRepository.query(sqlQuery, parameters);

  return result.map((row: any) => ({
    username: row.username,
    totalHours: parseFloat(row.totalHours || '0'),
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

async generateCustomReport(
  startDate: string,
  endDate: string,
  projectId?: number, // Add projectId
  teamId?: number,    // Add teamId
): Promise<ProgressReportDto> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new BadRequestException('Invalid date format. Use ISO format (YYYY-MM-DD).'); 
  }

  if (start > end) {
    throw new BadRequestException('Start date must be before end date.'); 
  }

  // Ensure end date includes the full day
  end.setHours(23, 59, 59, 999); 

  const query = this.taskRepository.createQueryBuilder('task')
    .where('task.createdAt BETWEEN :start AND :end', { start, end });

  if (projectId) {
    query.andWhere('task.projectId = :projectId', { projectId });
  }

  if (teamId) {
    // You'll need to join with project_teams_team and team entities
    query.leftJoin('task.project', 'project')
         .leftJoin('project.teams', 'team')
         .andWhere('team.id = :teamId', { teamId });
  }

  const tasks = await query.getMany(); // Use getMany() instead of find() for query builder 

  const completedTasks = tasks.filter(task => task.status === TaskStatus.COMPLETED).length; 
  const pendingTasks = tasks.length - completedTasks; 
  const completionPercentage = tasks.length === 0 ? 0 : (completedTasks / tasks.length) * 100; 

  const graphData: { date: string; completed: number }[] = []; 
  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)); 
  for (let i = daysDiff - 1; i >= 0; i--) {
    const day = new Date(end); 
    day.setDate(end.getDate() - i); 
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

async generateCustomReportPDF(
  startDate: string,
  endDate: string,
  projectId?: number, // Add projectId
  teamId?: number,    // Add teamId
): Promise<Buffer> {
  const report = await this.generateCustomReport(startDate, endDate, projectId, teamId); // Pass filters 

  const doc = new PDFDocument(); 
  const buffers: Uint8Array[] = []; 

  doc.on('data', buffers.push.bind(buffers)); 
  doc.on('end', () => {}); 

  doc.fontSize(18).text('Custom Progress Report', { align: 'center' }); 
  doc.moveDown(); 
  doc.fontSize(12).text(`Date Range: ${startDate} to ${endDate}`); 
  doc.text(`Completed Tasks: ${report.completedTasks}`); 
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
  doc.image(chartImage, { fit: [500, 300], align: 'center', valign: 'center' }); 

  doc.end(); 
  return new Promise<Buffer>((resolve) => {
    doc.on('end', () => {
      resolve(Buffer.concat(buffers));
    });
  });
}
  }