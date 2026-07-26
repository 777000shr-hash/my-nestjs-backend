import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService, 
    private configService: ConfigService,
  ) {
    
  }

  async create(username: string, email: string, passwordHash: string) {

    const existingUser = await this.usersRepository.findOne({ 
      where: { email: email } 
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordHash, salt);
    const newUser = this.usersRepository.create({ username, email, passwordHash: hashedPassword });
    
    return await this.usersRepository.save(newUser);
  }

  async findOne(id: number){
    return await this.usersRepository.findOne({ where: { id: id } });
  }

  async findAll(){
    return await this.usersRepository.find({
    select: {
        id: true,
        email: true,
        username: true,
      }
    });
  }

  async remove(id: number){
    return await this.usersRepository.delete(id);
  }

  async update(id: number, attrs: Partial<User>) {
    return await this.usersRepository.update(id, attrs);
  }

  async validateUser(email: string, passwordHash: string) {
    const user = await this.usersRepository.findOne({ where: { email } });
    
    if (user) {
      const equal = await bcrypt.compare(passwordHash, user.passwordHash);

      if(equal){
        const { passwordHash, ...result } = user;
        return result;
      }
    }
  
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async sendPasswordResetCode(email: string): Promise<void> {

    const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('No registered user found with this email address');
    }

    const gmailUser = this.configService.get<string>('GMAIL_USER');
    const gmailPassword = this.configService.get<string>('GMAIL_APP_PASSWORD');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

    user.resetCode = verificationCode;
    await this.usersRepository.save(user);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    await this.usersRepository.update(user.id, {
      resetTokenExpiresAt: expiresAt,
    });

    try {
      await transporter.sendMail({
        from: 'Alrobics Support <airobics.app@gmail.com>',
        to: email,
        subject: 'Your password recovery code',
        text: `Hello, your password recovery verification code is: ${verificationCode}
          This code is valid for the next 5 minutes only.`,
        html: `<strong>Hello,</strong><br>Your password recovery verification code is: <h1>${verificationCode}</h1>`,
      });

      console.log('Email sent successfully!');
    } catch (error: any) {
      console.error('Error sending email:', error);
      throw new Error('The recovery email could not be sent');
    }
  }

  async verifyResetCode(email: string, code: string): Promise<boolean> {
  
   const user = await this.usersRepository.findOne({ where: { email } });

    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    if (user.resetCode !== code) {
      throw new BadRequestException('The verification code is invalid.');
    }

    const now = new Date();
    if (user.resetTokenExpiresAt && new Date() > new Date(user.resetTokenExpiresAt)) {
      throw new BadRequestException('Code has expired');
    }

    return true;
  }

  async resetPassword(resetPasswordDto: { email: string; code: string; newPassword: string }) {
    const { email, code, newPassword } = resetPasswordDto;

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user || user.resetCode !== code) {
      throw new BadRequestException('Invalid or expired verification code');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    user.passwordHash = hashedPassword;
    user.resetCode = null;
    await this.usersRepository.update(user.id, {
    passwordHash: hashedPassword,
    resetCode: null,
    resetTokenExpiresAt: null
  });
    
    return { message: 'Password updated successfully' };
  }
}
