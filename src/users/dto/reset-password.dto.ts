import { IsString, MinLength, IsEmail } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  code!: string; // This is a unique field to reset.

  @IsString()
  @MinLength(6, { message: 'Password must contain at least 6 characters' })
  newPassword!: string; // This is the field corresponding to the password.
}
