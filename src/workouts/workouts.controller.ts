import { Controller, Post, Body, Get, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  // 1. שמירת אימון חדש
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
    const userId = req.user.userId;
    return this.workoutsService.addWorkout(userId, reps, workoutType, duration, calories, date, day);
  }

  // 2. קבלת סטטיסטיקות משתמש
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getUserStats(@Req() req: any) {
    const userId = req.user.userId;
    return this.workoutsService.getUserStats(userId);
  }

  // 3א. לוח שיאים שבועי - קלוריות (Top 10 + מיקום נוכחי) - דורש טוקן כעת
  @UseGuards(JwtAuthGuard)
  @Get('leaderboard/calories')
  async getCaloriesLeaderboard(@Req() req: any) {
    const userId = req.user.userId;
    return this.workoutsService.getCaloriesLeaderboard(userId);
  }

  // 3ב. לוח שיאים שבועי - חזרות (Top 10 + מיקום נוכחי) - דורש טוקן כעת
  @UseGuards(JwtAuthGuard)
  @Get('leaderboard/reps')
  async getRepsLeaderboard(@Req() req: any) {
    const userId = req.user.userId;
    return this.workoutsService.getRepsLeaderboard(userId);
  }

  // 4. שליפת היסטוריית אימונים
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getWorkoutHistory(@Req() req: any) {
    const userId = req.user.userId;
    return this.workoutsService.getWorkoutHistory(userId);
  }

  // 5. יצירת יעד חדש
  @UseGuards(JwtAuthGuard)
  @Post('goals')
  async createGoal(@Req() req: any, @Body() goalData: any) {
    const userId = req.user.userId;
    return await this.workoutsService.createGoal(userId, goalData);
  }

  // 6. קבלת היעדים של המשתמש (מחולק לפעילים ומהעבר)
  @UseGuards(JwtAuthGuard)
  @Get('goals')
  async getUserGoals(@Req() req: any) {
    const userId = req.user.userId;
    return await this.workoutsService.getUserGoals(userId);
  }

  // 7. מחיקת יעד אישי מאובטח ללא ID של משתמש בנתיב
  @UseGuards(JwtAuthGuard)
  @Delete('goals/:id')
  async deleteGoal(@Req() req: any, @Param('id') goalId: string) {
    const userId = req.user.userId;
    return await this.workoutsService.deleteGoal(userId, +goalId);
  }
}
