import { Controller, Post, Body, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  // 1. שמירת אימון חדש - מעודכן עם השדות הנוספים של אתי לטבלת ההיסטוריה
  @UseGuards(JwtAuthGuard)
  @Post()
  async addWorkout(
    @Body('userId', ParseIntPipe) userId: number,
    @Body('reps') reps: number,
    @Body('workoutType') workoutType: string,
    @Body('duration') duration: number,
    @Body('calories') calories: number,
    @Body('date') date: string,
    @Body('day') day: string,
  ) {
    return this.workoutsService.addWorkout(userId, reps, workoutType, duration, calories, date, day);
  }

  // 2. קבלת סטטיסטיקות משתמש (נשאר ללא שינוי)
  @UseGuards(JwtAuthGuard)
  @Get('stats/:userId')
  async getUserStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.workoutsService.getUserStats(userId);
  }

  // 3. קבלת לוח שיאים (נשאר ללא שינוי)
  @Get('leaderboard')
  async getLeaderboard() {
    return this.workoutsService.getLeaderboard();
  }

  // 4. חדש! שליפת היסטוריית האימונים המלאה של המשתמש עבור אתי
  @UseGuards(JwtAuthGuard)
  @Get('history/:userId')
  async getWorkoutHistory(@Param('userId', ParseIntPipe) userId: number) {
    return this.workoutsService.getWorkoutHistory(userId);
  }
}
