import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, Post, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
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
}