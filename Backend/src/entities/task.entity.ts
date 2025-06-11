import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { TaskComment } from './TaskComment.entity';
import { TaskAttachment } from './task-attachment.entity';
import { Project } from './project.entity';

export enum TaskStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
}

export enum PriorityLevel {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Column({ type: 'enum', enum: PriorityLevel, default: PriorityLevel.MEDIUM })
  priority: PriorityLevel;

  @Column({ nullable: true })
  category?: string;

  @Column({ nullable: true, type: 'timestamp' })
  dueDate?: Date | undefined;

  @ManyToOne(() => User, { eager: true })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true, eager: true })
  assignedTo?: User;

  @ManyToOne(() => User, { nullable: true, eager: true })
  approvedBy?: User;

  @Column({ default: false })
  isCompleted: boolean;

  @OneToMany(() => TaskComment, comment => comment.task)
  comments: TaskComment[];

  @OneToMany(() => TaskAttachment, attachment => attachment.task)
  attachments: TaskAttachment[];

   @ManyToOne(() => Project, project => project.tasks)
  project: Project;

  @Column()
  projectId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
