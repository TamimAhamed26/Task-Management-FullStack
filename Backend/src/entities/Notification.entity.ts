// entities/notification.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from './user.entity';
import { Task } from './task.entity';

@Entity()
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  notificationType: string;

  @Column()
  message: string;

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  relatedTaskId: number;

  @ManyToOne(() => User, user => user.notifications, { onDelete: 'CASCADE' })
  recipient: User;

  @ManyToOne(() => Task, { nullable: true })
  task: Task;
}