import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // מאיפה לקחת את הטוקן (מה-Header שנקרא Authorization)
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      // חייב להיות אותו מפתח סודי שהגדרת ב-Module!
      secretOrKey: 'MY_SUPER_SECRET_KEY_123', 
    });
  }

  // הפונקציה הזו רצה אחרי שהטוקן אומת. המידע ב-payload חוזר אלינו.
  async validate(payload: any) {
    // מה שנחזיר כאן ייכנס לתוך האובייקט req.user
    return { userId: payload.sub, email: payload.email };
  }
}