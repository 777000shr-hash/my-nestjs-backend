import { IsString, MinLength, IsEmail } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  email!: string;

  @IsString()
  code!: string; // זה שדה ייחודי לאיפוס

  @IsString()
  @MinLength(6, { message: 'Password must contain at least 6 characters' })
  newPassword!: string; // זה השדה המקביל לסיסמה
}