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
  createdAt: Date;
  updatedAt: Date;
}
