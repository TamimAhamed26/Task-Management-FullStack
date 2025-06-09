import { IsEnum, IsNotEmpty, IsDateString } from 'class-validator';
import { PriorityLevel } from '../../entities/task.entity';

export class SetDeadlinePriorityDto {
  
  @IsNotEmpty({ message: 'Due date is required.' })
  @IsDateString({}, { message: 'Due date must be a valid date .' })
  dueDate: Date;

  @IsNotEmpty({ message: 'Priority is required.' })
  @IsEnum(PriorityLevel, { message: 'Priority must be HIGH, MEDIUM, or LOW.' })
  priority: PriorityLevel;
}
