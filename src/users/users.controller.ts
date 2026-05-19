import { Controller, Post, Body, Get, Param, Delete, Patch, UnauthorizedException, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './create-user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('login')
  async login(@Body() loginData:{email: string, passwordHash: string}){
    const user =  await this.usersService.validateUser(loginData.email, loginData.passwordHash);

    if(!user){
      throw new UnauthorizedException('אימייל או סיסמה אינם נכונים');
    }
    return  this.usersService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req) {
     return req.user;
   }
  
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto.username, createUserDto.email, createUserDto.passwordHash);
  }
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id') id: string){
    return this.usersService.findOne(+id);
  }
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(){
    return this.usersService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string){
    return this.usersService.remove(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any){
    return this.usersService.update(+id, body);
  }

  @Post('forgot-password')
async forgotPassword(@Body('email') email: string) {
  await this.usersService.sendPasswordResetCode(email);
  return { message: 'קוד אימות נשלח בהצלחה לתיבת המייל שלך' };
}
}