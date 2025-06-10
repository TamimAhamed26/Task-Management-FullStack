// src/task/dto/task.dto.ts
export class TaskDto {
  id: number;
  title: string;
  description?: string;
  status: string;
  priority: string;
  category?: string;
  dueDate?: Date;
  createdByUsername: string;
  assignedToUsername?: string;
  approvedByUsername?: string;
  isCompleted: boolean;
  parentTaskId?: number; // Added for subtask
  subtasks?: TaskDto[]; // Added for subtask
  createdAt: Date;
  updatedAt: Date;
}
