import { Controller, Post, Body, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  // 1. שמירת אימון חדש
  @UseGuards(JwtAuthGuard)
  @Post()
  async addWorkout(
    @Body('userId', ParseIntPipe) userId: number,
    @Body('reps') reps: number,
    @Body('workoutType') workoutType: string,
  ) {
    return this.workoutsService.addWorkout(userId, reps, workoutType);
  }

  // 2. קבלת סטטיסטיקות משתמש
  @UseGuards(JwtAuthGuard)
  @Get('stats/:userId')
  async getUserStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.workoutsService.getUserStats(userId);
  }

  // 3. קבלת לוח שיאים
  @Get('leaderboard')
  async getLeaderboard() {
    return this.workoutsService.getLeaderboard();
  }
}
