export interface TaskCompletionRateDto {
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
}

export interface WorkloadDistributionDto {
  username: string;
  taskCount: number;
}

export interface AverageCompletionTimeDto {
  averageDays: number;
}


export interface TotalHoursPerTaskDto {
  taskId: number;
  title: string;
  totalHours: number;
}

export interface TotalHoursPerUserDto {
  username: string;
  totalHours: number;
}