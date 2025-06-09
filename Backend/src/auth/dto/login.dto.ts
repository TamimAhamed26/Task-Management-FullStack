import { IsEmail, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty({message:"missing email"})
  email: string;
  rememberMe?: boolean; 

  @IsNotEmpty()
  
  password: string;
}
