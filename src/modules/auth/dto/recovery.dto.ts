import { IsString, IsNotEmpty, IsEmail } from 'class-validator';

export class RecoveryDto {
  @IsString()
  @IsNotEmpty()
  @IsEmail()
  readonly email: string;
}

export class ResetPassDto {
  @IsString()
  @IsNotEmpty()
  readonly token: string;

  @IsString()
  @IsNotEmpty()
  readonly newPassword: string;
}
