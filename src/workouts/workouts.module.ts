import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';
import { Workout } from './workout.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Workout, User])], // רושם את הטבלאות לשימוש
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
