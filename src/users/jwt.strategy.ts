import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private usersService: UsersService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // חייב להיות אותו מפתח סודי שהגדרת ב-Module!
      secretOrKey: 'MY_SUPER_SECRET_KEY_123', 
    });
  }

  // הפונקציה הזו רצה אחרי שהטוקן אומת. המידע ב-payload חוזר אלינו.
  async validate(payload: any) {
    
    const user = await this.usersService.findOne(payload.sub);
    
    if (!user) {
      throw new UnauthorizedException();
    }

    return { userId: payload.sub, email: payload.email, username: user.username };
  }
}