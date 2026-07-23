import { Controller, Post, Body, Get, Delete, Param, UseGuards, Req, Query } from '@nestjs/common';
import { WorkoutsService } from './workouts.service';
import { JwtAuthGuard } from '../users/jwt-auth.guard';

@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  /**
   * Log a new workout entry for the authenticated user
   */
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

  /**
   * Retrieve aggregate statistics for the authenticated user
   */
  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getUserStats(@Req() req: any) {
    const userId = req.user.userId;
    return this.workoutsService.getUserStats(userId);
  }

  /**
   * Fetch weekly calories leaderboard (Top 10 and current user rank)
   */
  @UseGuards(JwtAuthGuard)
  @Get('leaderboard/calories')
  async getCaloriesLeaderboard(@Req() req: any) {
    const userId = req.user.userId;
    return this.workoutsService.getCaloriesLeaderboard(userId);
  }

  /**
   * Fetch weekly reps leaderboard (Top 10 and current user rank)
   */
  @UseGuards(JwtAuthGuard)
  @Get('leaderboard/reps')
  async getRepsLeaderboard(@Req() req: any) {
    const userId = req.user.userId;
    return this.workoutsService.getRepsLeaderboard(userId);
  }

  /**
   * Retrieve paginated workout history for the authenticated user
   */
  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getWorkoutHistory(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const userId = req.user.userId;
    const parsedLimit = limit ? Number(limit) : 30;
    const parsedOffset = offset ? Number(offset) : 0;
    return this.workoutsService.getWorkoutHistory(userId, parsedLimit, parsedOffset);
  }

  /**
   * Create a new goal for the authenticated user
   */
  @UseGuards(JwtAuthGuard)
  @Post('goals')
  async createGoal(@Req() req: any, @Body() goalData: any) {
    const userId = req.user.userId;
    return await this.workoutsService.createGoal(userId, goalData);
  }

  /**
   * Retrieve all goals for the authenticated user (categorized into active and past)
   */
  @UseGuards(JwtAuthGuard)
  @Get('goals')
  async getUserGoals(@Req() req: any) {
    const userId = req.user.userId;
    return await this.workoutsService.getUserGoals(userId);
  }

  /**
   * Delete a specific goal by ID for the authenticated user
   */
  @UseGuards(JwtAuthGuard)
  @Delete('goals/:id')
  async deleteGoal(@Req() req: any, @Param('id') goalId: string) {
    const userId = req.user.userId;
    return await this.workoutsService.deleteGoal(userId, +goalId);
  }
}
