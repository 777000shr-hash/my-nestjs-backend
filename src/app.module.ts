import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { ConfigModule, ConfigService } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // טוען את ה-.env ראשון לכל האפליקציה
    }),
    // שינוי ל-forRootAsync שמבטיח טעינה רק לאחר שהקונפיגורציה מוכנה
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        host: configService.get<string>('DB_HOST') || 'localhost',
        port: configService.get<number>('DB_PORT') || 5432,
        username: configService.get<string>('DB_USERNAME') || 'postgres',
        password: configService.get<string>('DB_PASSWORD'), // קריאה בטוחה ומאובטחת!
        database: configService.get<string>('DB_NAME') || 'fitness_app',
        autoLoadEntities: true,
        synchronize: true,
        ssl: configService.get<string>('DATABASE_URL') ? { rejectUnauthorized: false } : false,
      }),
    }),
    UsersModule,
  ],
})
export class AppModule {}