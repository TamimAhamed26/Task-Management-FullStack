import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Stripe from 'stripe';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentHistory } from 'src/entities/payment-history.entity';
import { Task } from 'src/entities/task.entity';
import { User } from 'src/entities/user.entity';

@Injectable()
export class PaymentService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(PaymentHistory)
    private paymentHistoryRepo: Repository<PaymentHistory>,

    @InjectRepository(Task)
    private taskRepo: Repository<Task>,

    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
      apiVersion: '2025-04-30.basil',
    });
  }

  async createBonusPayment(dto: CreatePaymentDto) {
    const task = await this.taskRepo.findOneBy({ id: dto.taskId });
    if (!task) throw new Error('Task not found');

    const user = await this.userRepo.findOneBy({ id: dto.collaboratorId });
    if (!user) throw new Error('User not found');

 
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: Math.round(dto.amount * 100),
      currency: 'usd',
      description: dto.description,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', 
      },
      metadata: {
        taskId: String(task.id),
        userId: String(user.id),
      },
    });

    const record = this.paymentHistoryRepo.create({
      task,
      Collaborator: user,
      amount: dto.amount,
      status: 'pending',
      stripePaymentIntentId: paymentIntent.id,
    });

    await this.paymentHistoryRepo.save(record);

    return {
      clientSecret: paymentIntent.client_secret,
      paymentId: paymentIntent.id,
    };
  }

  async updatePaymentMethod(paymentIntentId: string, paymentMethodId: string) {
    try {
      const updatedIntent = await this.stripe.paymentIntents.update(paymentIntentId, {
        payment_method: paymentMethodId,
      });
      
      return {
        clientSecret: updatedIntent.client_secret,
        status: updatedIntent.status,
      };
    } catch (error) {
      throw new Error(`Failed to update payment method: ${error.message}`);
    }
  }

  async confirmPayment(paymentIntentId: string) {
    try {
     
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
    
      if (intent.status === 'requires_confirmation') {
        const paymentIntent = await this.stripe.paymentIntents.confirm(
          paymentIntentId,
          { 
            return_url: process.env.PAYMENT_RETURN_URL || 'http://localhost:3000/payment/return',
          }
        );
        
       
        if (paymentIntent.status === 'succeeded') {
          const record = await this.paymentHistoryRepo.findOneBy({ stripePaymentIntentId: paymentIntentId });
          if (!record) throw new Error('Payment record not found');
  
          record.status = 'completed';
          await this.paymentHistoryRepo.save(record);
          return { success: true, status: paymentIntent.status };
        }
  
   
        if (paymentIntent.status === 'requires_action') {
          return {
            success: false,
            status: paymentIntent.status,
            next_action: paymentIntent.next_action,
            client_secret: paymentIntent.client_secret,
          };
        }
  
        return { success: false, status: paymentIntent.status };
      } else {
    
        if (intent.status === 'succeeded') {
          const record = await this.paymentHistoryRepo.findOneBy({ stripePaymentIntentId: paymentIntentId });
          if (record && record.status !== 'completed') {
            record.status = 'completed';
            await this.paymentHistoryRepo.save(record);
          }
          return { success: true, status: intent.status };
        }
        
        return { success: false, status: intent.status };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getPaymentStatus(paymentIntentId: string) {
    try {
      const paymentIntent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (paymentIntent.status === 'succeeded') {
        const record = await this.paymentHistoryRepo.findOneBy({ stripePaymentIntentId: paymentIntentId });
        if (record && record.status !== 'completed') {
          record.status = 'completed';
          await this.paymentHistoryRepo.save(record);
        }
      }
      
      return {
        success: paymentIntent.status === 'succeeded',
        status: paymentIntent.status,
        client_secret: paymentIntent.client_secret,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}