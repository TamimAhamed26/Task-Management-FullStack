export interface CreateTimeLogDto {
  hours: number;
  description?: string;
}

export interface TimeLogDto {
  id: number;
  taskId: number;
  loggedByUsername: string;
  hours: number;
  description?: string;
  createdAt: Date;
}