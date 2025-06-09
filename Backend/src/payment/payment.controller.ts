import { Controller, Post, Body, Query, BadRequestException, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { Roles } from 'src/auth/decorators/roles.decorator';

@Controller('payment')
  @Roles('MANAGER')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('bonus')
  async createBonus(@Body() dto: CreatePaymentDto) {
    if (!dto.amount || !dto.collaboratorId || !dto.taskId) {
      throw new BadRequestException('Missing required fields: amount, taskId, collaboratorId');
    }
    return await this.paymentService.createBonusPayment(dto);
  }

  @Post('update-payment-method')
  async updatePaymentMethod(
    @Body() body: { paymentIntentId: string; paymentMethodId: string },
  ) {
    if (!body.paymentIntentId || !body.paymentMethodId) {
      throw new BadRequestException('Missing required fields: paymentIntentId, paymentMethodId');
    }
    
    return await this.paymentService.updatePaymentMethod(
      body.paymentIntentId, 
      body.paymentMethodId
    );
  }

  @Post('confirm')
  async confirm(@Query('paymentIntentId') paymentIntentId: string) {
    if (!paymentIntentId) {
      throw new BadRequestException('Missing paymentIntentId in query');
    }
    return await this.paymentService.confirmPayment(paymentIntentId);
  }

  @Get('status')
  async getStatus(@Query('paymentIntentId') paymentIntentId: string) {
    if (!paymentIntentId) {
      throw new BadRequestException('Missing paymentIntentId in query');
    }
    return await this.paymentService.getPaymentStatus(paymentIntentId);
  }
  
  @Get('return')
  async handleReturn(
    @Query('payment_intent') paymentIntentId: string,
    @Res() res: Response,
  ) {
    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Missing payment_intent parameter' });
    }
    
    const status = await this.paymentService.getPaymentStatus(paymentIntentId);
    

    return res.status(200).json({
      message: 'Payment processing completed',
      ...status
    });
  }
}