export class NotificationDto {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
  relatedTaskId?: number;
  createdAt: Date;
}
