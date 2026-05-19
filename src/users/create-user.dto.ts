import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Please enter a valid email address' })
  email!: string;

  @IsString()
  @MinLength(6, { message: 'Password must contain at least 6 characters' })
  passwordHash!: string;

  @IsString()
  @IsNotEmpty({ message: 'Please enter a username' })
  username!: string;
}