export interface TaskCommentDto {
  id: number;
  taskId: number;
  authorUsername: string;
  content: string;
  mentions: number[];
  createdAt: Date;
}
