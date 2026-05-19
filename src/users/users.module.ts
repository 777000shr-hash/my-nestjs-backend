import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // <-- 1. הוספנו את הייבוא הזה
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule, // <-- 2. הוספנו את זה כאן כדי שה-Service יוכל לקרוא את ה-env!
    
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