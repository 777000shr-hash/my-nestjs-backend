import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService, 
  ) {}

  async create(email: string, passwordHash: string) {

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordHash, salt);
    const newUser = this.usersRepository.create({ email, passwordHash: hashedPassword });
    
    return await this.usersRepository.save(newUser);
  }

  async findOne(id: number){
    return await this.usersRepository.findOne({ where: { id: id } });
  }

  async findAll(){
    return await this.usersRepository.find({
    select: ['id', 'email']
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
}