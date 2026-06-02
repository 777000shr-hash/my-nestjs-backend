import { Controller, Post, Body, Get, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  // 1. שמירת אימון חדש - ה-userId נשלף כעת מהטוקן המאובטח ולא מה-Body
  @UseGuards(JwtAuthGuard)
  @Post()
  async addWorkout(
    @Req() req: any,
    @Body('reps') reps: number,
    @Body('workoutType') workoutType: string,
    @Body('duration') duration: number,
    @Body('calories') calories: number,
    @Body('date') date: string,
    @Body('day') day: string,
  ) {
    const userId = req.user.id; // שילוף ה-ID אוטומטית מהטוקן שאתי שולחת
    return this.workoutsService.addWorkout(userId, reps, workoutType, duration, calories, date, day);
  }

  // 2. קבלת סטטיסטיקות משתמש - נשאר ללא שינוי
  @UseGuards(JwtAuthGuard)
  @Get('stats/:userId')
  async getUserStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.workoutsService.getUserStats(userId);
  }

  // 3. קבלת לוח שיאים - נשאר ציבורי ללא שינוי
  @Get('leaderboard')
  async getLeaderboard() {
    return this.workoutsService.getLeaderboard();
  }

  // 4. שליפת היסטוריית אימונים - נשאר ללא שינוי
  @UseGuards(JwtAuthGuard)
  @Get('history/:userId')
  async getWorkoutHistory(@Param('userId', ParseIntPipe) userId: number) {
    return this.workoutsService.getWorkoutHistory(userId);
  }
}
