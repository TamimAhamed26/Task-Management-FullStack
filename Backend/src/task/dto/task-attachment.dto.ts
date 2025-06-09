
export interface TaskAttachmentDto {
  id: number;
  taskId: number;
  uploaderUsername: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
}
