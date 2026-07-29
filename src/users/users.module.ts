import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User } from './entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';

/**
 * Module responsible for managing user operations and handling authentication.
 * Configures TypeORM repository binding, configuration settings, and JWT parameters.
 */
@Module({
  imports: [
    // Register the User entity repository for TypeORM dependency injection
    TypeOrmModule.forFeature([User]),
    // Import ConfigModule to access environment variables within services
    ConfigModule,
    
    // Configure JSON Web Token (JWT) options for authentication
    JwtModule.register({
      secret: 'MY_SUPER_SECRET_KEY_123',
      signOptions: { expiresIn: '1d' }, // Token expiration time set to 1 day
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtStrategy],
  exports: [UsersService], // Export UsersService for use in other modules
})
export class UsersModule {}
