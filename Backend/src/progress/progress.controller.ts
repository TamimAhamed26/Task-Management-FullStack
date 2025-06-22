import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { Response } from 'express';
import { ProgressService } from './progress.service';
import { ProgressReportDto } from './dto/ProgressReportDto';
import { Roles } from '../auth/decorators/roles.decorator'; 
import { Task } from 'src/entities/task.entity';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileService } from '../file/file.service';
import { EmailService } from '../email/email.service'; 
import * as path from 'path';
import * as fs from 'fs';
import { UserService } from 'src/user/user.service';
import { AverageCompletionTimeDto, TaskCompletionRateDto, TotalHoursPerTaskDto, TotalHoursPerUserDto, WorkloadDistributionDto } from './dto/progress.dto';
import { GetUser } from 'src/auth/decorators/get-user.decorator';


@Controller('progress')
export class ProgressController {
  constructor(  private readonly progressService: ProgressService,
    private readonly userService: UserService,
    private readonly fileService: FileService,
    private readonly emailService: EmailService,) {}

  @Get('weekly-report')
  @Roles('MANAGER')
  async getWeeklyReport(): Promise<ProgressReportDto > {
    return this.progressService.generateWeeklyReport();
  }

  @Get('monthly-report')
@Roles('MANAGER')
async getMonthlyReport(): Promise<ProgressReportDto  > {
  return this.progressService.generateMonthlyReport();
}
@Get('search')
@Roles('MANAGER')
async searchTasksByDate(
  @Query('startDate') startDate: string,
  @Query('endDate') endDate: string,
  @Query('sort') sort: 'ASC' | 'DESC' = 'ASC',
  @Query('page') page = 1,
  @Query('limit') limit = 10,
): Promise<{ data: Task[]; total: number; page: number; limit: number }> {
  return this.progressService.searchTasksByDate(
    startDate,
    endDate,
    sort,
    Number(page),
    Number(limit),
  );
}

@Get('download-weekly-report-pdf')
@Roles('MANAGER')
async downloadWeeklyReportPDF(@Res() res: Response) {
  const pdfBuffer = await this.progressService.generateWeeklyReportPDF();

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'attachment; filename=weekly_report.pdf',
    'Content-Length': pdfBuffer.length,
  });

  res.send(pdfBuffer);
}

@Post('upload')
@Roles('MANAGER')
@UseInterceptors(FileInterceptor('file'))
async handleFileUpload(
  @UploadedFile() file: Express.Multer.File,
  @Body('email') email: string,
) {
  if (!email) {
    throw new BadRequestException('Uploader email is required');
  }

  return this.progressService.uploadReportFileAndNotifyManager(file, email);
}
@Get('download/:filename')
@Roles('ADMIN')
async downloadFile(@Param('filename') filename: string, @Res() res: Response) {
  const filePath = path.join(__dirname, '..', '..', 'uploads', filename);

  if (!fs.existsSync(filePath)) {
    throw new BadRequestException('File not found');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}

 @Get('task-completion-rate')
  @Roles('MANAGER')
  async getTaskCompletionRate(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('username') username?: string,
    @Query('userId') userId?: string,
    @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number, 
    @Query('teamId', new ParseIntPipe({ optional: true })) teamId?: number,    
  ): Promise<TaskCompletionRateDto> {
    return this.progressService.getTaskCompletionRate(
      startDate,
      endDate,
      username,
      userId ? parseInt(userId, 10) : undefined,
      projectId, 
    );
  }

  @Get('average-completion-time')
  @Roles('MANAGER')
  async getAverageCompletionTime(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('username') username?: string,
    @Query('userId') userId?: string,
  ): Promise<AverageCompletionTimeDto> {
    return this.progressService.getAverageCompletionTime(
      startDate,
      endDate,
      username,
      userId ? parseInt(userId, 10) : undefined,
    );
  }

@Get('workload-distribution')
  @Roles('MANAGER', 'COLLABORATOR') // Both roles can access, service handles internal filtering
  async getWorkloadDistribution(
    @GetUser('id') requestingUserId: number, // Inject the authenticated user's ID
    @Query('username') username?: string,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number, // Parsed as number
    @Query('startDate') startDateStr?: string, // Renamed to avoid direct Date type for query param
    @Query('endDate') endDateStr?: string,     // Renamed
    @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number,
    @Query('teamId', new ParseIntPipe({ optional: true })) teamId?: number,
  ): Promise<WorkloadDistributionDto[]> {
    // Parse date strings to Date objects for the service layer
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.progressService.getWorkloadDistribution(
      requestingUserId,
      username,
      userId,
      startDate, // Pass parsed Date object
      endDate,   // Pass parsed Date object
      projectId,
      teamId,
    );
  }

  @Get('total-hours/user')
  @Roles('MANAGER', 'COLLABORATOR') // Both roles can access, service handles internal filtering
  async getTotalHoursPerUser(
    @GetUser('id') requestingUserId: number, // Inject the authenticated user's ID
    @Query('username') username?: string,
    @Query('userId', new ParseIntPipe({ optional: true })) userId?: number, // Parsed as number
    @Query('startDate') startDateStr?: string, // Renamed
    @Query('endDate') endDateStr?: string,     // Renamed
    @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number,
    @Query('teamId', new ParseIntPipe({ optional: true })) teamId?: number,
  ): Promise<TotalHoursPerUserDto[]> {
    // Parse date strings to Date objects for the service layer
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    return this.progressService.getTotalHoursPerUser(
      requestingUserId,
      username,
      userId,
      startDate, // Pass parsed Date object
      endDate,   // Pass parsed Date object
      projectId,
      teamId,
    );
  }

  @Get('total-hours/task/:id')
  @Roles('MANAGER')
  async getTotalHoursPerTask(
    @Param('id', ParseIntPipe) taskId: number,
  ): Promise<TotalHoursPerTaskDto> {
    return this.progressService.getTotalHoursPerTask(taskId);
  }


 @Get('custom-report')
  @Roles('MANAGER')
  async getCustomReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number, // Add projectId
    @Query('teamId', new ParseIntPipe({ optional: true })) teamId?: number,      // Add teamId
  ): Promise<ProgressReportDto> {
    if (!startDate || !endDate) {
      throw new BadRequestException('Start date and end date are required.'); 
    }
    return this.progressService.generateCustomReport(startDate, endDate, projectId, teamId);
  }

  @Get('download-custom-report-pdf')
  @Roles('MANAGER')
  async downloadCustomReportPDF(
    @Res() res: Response,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('projectId', new ParseIntPipe({ optional: true })) projectId?: number, // Add projectId
    @Query('teamId', new ParseIntPipe({ optional: true })) teamId?: number,      // Add teamId
  ) {
    const pdfBuffer = await this.progressService.generateCustomReportPDF(startDate, endDate, projectId, teamId); 
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=custom_report_${startDate}_to_${endDate}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.send(pdfBuffer);
  }
}
