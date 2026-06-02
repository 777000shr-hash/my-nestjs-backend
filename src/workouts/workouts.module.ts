import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkoutsService } from './workouts.service';
import { WorkoutsController } from './workouts.controller';
import { Workout } from './workout.entity';
import { Goal } from './entities/goal.entity'; // הייבוא החדש

@Module({
  imports: [TypeOrmModule: [Workout, Goal]], // הוספת Goal לכאן
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
  exports: [WorkoutsService],
})
export class WorkoutsModule {}
