import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { AppService } from './app.service';
import { getUserStats, getLeaderboard, addWorkout } from './workoutService';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('users/:id/stats')
  async getStats(@Param('id') id: string) {
    // הפיכת ה-id מטקסט למספר, והפעלת הלוגיקה שלך
    const userId = parseInt(id, 10);
    return await getUserStats(userId);
  }

  @Get('leaderboard')
  async getLeaderboardData() {
    return await getLeaderboard();
  }

  @Post('workouts')
  async createWorkout(
    @Body() body: { userId: number; reps: number; workoutType: string }
  ) {
    const { userId, reps, workoutType } = body;
    return await addWorkout(userId, reps, workoutType);
  }

}
