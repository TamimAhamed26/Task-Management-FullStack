import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity()
export class TimeLog {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task, { onDelete: 'CASCADE' })
  task: Task;

  @Column()
  taskId: number;

  @ManyToOne(() => User)
  loggedBy: User;

  @Column('float')
  hours: number; // Time spent in hours (e.g., 2.5 for 2 hours 30 minutes)

  @Column({ nullable: true })
  description?: string; // Optional notes about the work done

  @CreateDateColumn()
  createdAt: Date;
}