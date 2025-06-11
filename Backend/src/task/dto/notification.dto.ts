export class NotificationDto {
  id: number;
  notificationType: string;
  message: string;
  isRead: boolean;
  relatedTaskId: number;
  taskTitle: string;
  createdAt: Date;
}