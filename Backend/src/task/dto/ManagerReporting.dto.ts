import { IsNumber } from "class-validator";
import { PriorityLevel } from "src/entities/task.entity";

export class TaskStatusSummary {
  status: string;
  count: number;
}

export class AssigneeSummary {
  username: string;
  taskCount: number;
}

export class ManagerOverviewDto {
  totalTasks: number;
  statusSummary: TaskStatusSummary[];
  assigneeSummary: AssigneeSummary[];
}

export class OverdueTaskDto {
  id: number;
  title: string;
  assigneeUsername: string;
  dueDate?: Date;
  priority: string;
  status: string;
  @IsNumber()
  daysOverdue: number;
}

export class ProjectDto {
  id: number;
  name: string;
  description: string;
  ownerUsername: string;
  teamMembers: string[];
}

export class TaskPrioritySummaryDto {
  priority: PriorityLevel;
  count: number;
}
export class TeamStatusSummary {
  teamId: number;
  teamName: string;
  status: string;
  count: number;
}

export class TeamTotalHoursLogged {
  teamId: number;
  teamName: string;
  totalHours: number;
}

export class TeamCompletionRate {
  teamId: number;
  teamName: string;
  completionRate: number;
  completedTasks: number;
  totalTasks: number;
}

export class ManagerTeamOverviewDto {
  totalTasksForTeams: number;
  overdueTasksForTeams: number;
  teamStatusSummaries: TeamStatusSummary[];
  teamTotalHoursLogged: TeamTotalHoursLogged[];
  teamCompletionRates: TeamCompletionRate[];
}