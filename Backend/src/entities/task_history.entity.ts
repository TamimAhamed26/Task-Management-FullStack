import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';

@Entity()
export class TaskHistory {
  @PrimaryGeneratedColumn()
  id: number;


 @Column({ nullable: true }) 
  taskId: number;
  @ManyToOne(() => User)
  changedBy: User;

  @Column()
  action: string; 

  @Column({ type: 'jsonb', nullable: true })
  details: any; 

  @CreateDateColumn()
  timestamp: Date;
}