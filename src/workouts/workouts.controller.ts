import { Controller, Post, Body, Get, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  // 1. שמירת אימון חדש - ה-userId נשלף מהטוקן
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
    const userId = req.user.id; 
    return this.workoutsService.addWorkout(userId, reps, workoutType, duration, calories, date, day);
  }

  // 2. קבלת סטטיסטיקות משתמש
  @UseGuards(JwtAuthGuard)
  @Get('stats/:userId')
  async getUserStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.workoutsService.getUserStats(userId);
  }

  // 3. קבלת לוח שיאים - ציבורי
  @Get('leaderboard')
  async getLeaderboard() {
    return this.workoutsService.getLeaderboard();
  }

  // 4. הגרסה החדשה! שליפת היסטוריית אימונים ללא ID בנתיב
  // הנתיב החדש שאתי תקרא לו הוא פשוט: GET /workouts/history
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getWorkoutHistory(@Req() req: any) {
    const userId = req.user.id; // שליפה מאובטחת של ה-ID ישירות מהטוקן
    return this.workoutsService.getWorkoutHistory(userId);
  }
}
