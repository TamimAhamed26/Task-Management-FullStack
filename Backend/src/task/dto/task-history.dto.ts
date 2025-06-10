export interface TaskHistoryDto {
  id: number;
  taskId: number;
  changedByUsername: string;
  action: string;
  details: any;
  timestamp: Date;
}