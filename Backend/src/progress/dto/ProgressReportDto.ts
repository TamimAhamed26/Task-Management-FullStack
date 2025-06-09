export class ProgressReportDto {
    completedTasks: number;
    pendingTasks: number;
    completionPercentage: number;
    weeklyGraphData: { date: string; completed: number }[];
  }
  