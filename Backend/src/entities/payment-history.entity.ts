// src/payment/entities/payment-history.entity.ts

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { Task } from './task.entity';
import { User } from './user.entity';


@Entity()
export class PaymentHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Task)
  task: Task;

  @ManyToOne(() => User)
  Collaborator: User;

  @Column('decimal')
  amount: number;

  @Column()
  status: string; 

  @Column()
  stripePaymentIntentId: string;

  @CreateDateColumn()
  paymentDate: Date;
}
