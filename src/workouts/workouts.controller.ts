import { Controller, Post, Body, Get, Param, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  // 1. שמירת אימון חדש - מתוקן ל-userId לפי ה-JwtStrategy של שיינדי
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
    const userId = req.user.userId; // שליפה מדויקת לפי ה-Strategy!
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

  // 4. שליפת היסטוריית אימונים ללא ID בנתיב - מתוקן ל-userId
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getWorkoutHistory(@Req() req: any) {
    const userId = req.user.userId; // שליפה מדויקת לפי ה-Strategy!
    return this.workoutsService.getWorkoutHistory(userId);
  }

  // 5. יצירת יעד חדש
  @UseGuards(JwtAuthGuard)
  @Post('goals')
  async createGoal(@Req() req: any, @Body() goalData: any) {
    const userId = req.user.userId; // מתוקן ל-userId
    return await this.workoutsService.createGoal(userId, goalData);
  }

  // 6. קבלת כל היעדים של המשתמש
  @UseGuards(JwtAuthGuard)
  @Get('goals')
  async getUserGoals(@Req() req: any) {
    const userId = req.user.userId; // מתוקן ל-userId
    return await this.workoutsService.getUserGoals(userId);
  }
  
}
