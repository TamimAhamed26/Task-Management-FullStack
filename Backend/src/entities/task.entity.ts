
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { User } from './user.entity';
  
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
    dueDate?: Date;
  
    @ManyToOne(() => User, { eager: true })
    createdBy: User; 
    @ManyToOne(() => User, { nullable: true, eager: true })
    assignedTo?: User; 
  
    @ManyToOne(() => User, { nullable: true, eager: true })
    approvedBy?: User; 
  
    @Column({ default: false })
    isCompleted: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }
  