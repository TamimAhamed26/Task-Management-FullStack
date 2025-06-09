// src/payment/payment.module.ts

import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentHistory } from 'src/entities/payment-history.entity';
import { Task } from 'src/entities/task.entity';
import { User } from 'src/entities/user.entity';


@Module({
  imports: [TypeOrmModule.forFeature([PaymentHistory, Task, User])],
  providers: [PaymentService],
  controllers: [PaymentController],
})
export class PaymentModule {}
