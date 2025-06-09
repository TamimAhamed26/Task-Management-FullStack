import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity()
export class TaskComment {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, task => task.comments, { onDelete: 'CASCADE' })
  task: Task;

  @ManyToOne(() => User, { eager: true })
  author: User;

  @Column({ type: 'text' })
  content: string;

  @Column('simple-array', { nullable: true })
  mentions: number[]; 

  @CreateDateColumn()
  createdAt: Date;
}
