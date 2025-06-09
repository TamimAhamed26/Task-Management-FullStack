import { IsOptional, IsEmail, IsString, Matches } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @Matches(/^01[3-9]\d{8}$/, {
    message: 'Phone number must be a valid  mobile number (e.g., 017XXXXXXXX).',
  })
  phone?: string;
}
