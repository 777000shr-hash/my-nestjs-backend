import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    // הגדרת ה-JWT
    JwtModule.register({
      secret: 'MY_SUPER_SECRET_KEY_123', // זה המפתח הסודי שלך, תשמרי עליו!
      signOptions: { expiresIn: '1d' }, // הטוקן יהיה בתוקף ליום אחד
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy],
})
export class UsersModule {}