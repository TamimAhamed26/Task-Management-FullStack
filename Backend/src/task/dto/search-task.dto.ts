import { IsOptional, IsEnum, IsString, IsDateString } from 'class-validator';
import { PriorityLevel, TaskStatus } from 'src/entities/task.entity';

export class SearchTaskDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @IsOptional()
  @IsEnum(PriorityLevel)
  priority?: PriorityLevel;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsDateString()
  dueBefore?: string;

  @IsOptional()
  @IsString()
  assignedToUsername?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}