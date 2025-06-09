import { IsNumber, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  taskId: number;

  @IsNumber()
  collaboratorId: number;

  @IsNumber()
  amount: number;

  @IsString()
  description: string;
}
