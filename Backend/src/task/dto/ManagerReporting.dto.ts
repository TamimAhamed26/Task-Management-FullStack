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
