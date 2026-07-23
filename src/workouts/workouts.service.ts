import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Workout } from './workout.entity';
import { User } from '../users/entities/user.entity';
import { Goal } from './entities/goal.entity';

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(Workout)
    private readonly workoutRepository: Repository<Workout>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Goal)
    private readonly goalsRepository: Repository<Goal>,
  ) {}

  /**
   * Save a new workout log for a user
   */
  async addWorkout(
    userId: number, 
    reps: number, 
    workoutType: string,
    duration: number,
    calories: number,
    date: string,
    day: string
  ) {
    const userExists = await this.userRepository.findOne({ where: { id: userId } });
    if (!userExists) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const newWorkout = this.workoutRepository.create({ 
      userId, 
      reps, 
      workoutType,
      duration,
      calories,
      date,
      day
    });
    return await this.workoutRepository.save(newWorkout);
  }

  /**
   * Get total aggregated statistics for a user
   */
  async getUserStats(userId: number) {
    const workouts = await this.workoutRepository.find({ where: { userId } });
    const totalWorkouts = workouts.length;
    const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0);
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);

    return { userId, totalWorkouts, totalReps, totalCalories };
  }

  /**
   * Helper method to generate weekly leaderboard data for active users
   */
  private async buildFullLeaderboardData(metricExtractor: (workouts: Workout[]) => number) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const users = await this.userRepository.find();
    
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const weeklyWorkouts = await this.workoutRepository.find({
          where: { 
            userId: user.id, 
            createdAt: MoreThanOrEqual(oneWeekAgo) 
          },
          order: { createdAt: 'DESC' }
        });

        const score = metricExtractor(weeklyWorkouts);
        const lastWorkoutTime = weeklyWorkouts.length > 0 ? weeklyWorkouts[0].createdAt.getTime() : 0;

        return {
          id: user.id,
          username: user.username,
          score,
          lastWorkoutTime
        };
      })
    );

    return leaderboard
      .filter(user => user.score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.lastWorkoutTime - a.lastWorkoutTime;
      });
  }

  /**
   * Get weekly calories leaderboard (Top 10 & Current User Rank)
   */
  async getCaloriesLeaderboard(currentUserId: number) {
    const fullBoard = await this.buildFullLeaderboardData((workouts) => workouts.reduce((sum, w) => sum + w.calories, 0));
    const userIndex = fullBoard.findIndex(u => u.id === currentUserId);
    const userScore = userIndex !== -1 ? fullBoard[userIndex].score : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const userWeeklyWorkouts = await this.workoutRepository.find({
      where: { 
        userId: currentUserId, 
        createdAt: MoreThanOrEqual(oneWeekAgo) 
      }
    });
    const userWeeklyReps = userWeeklyWorkouts.reduce((sum, w) => sum + w.reps, 0);

    return {
      leaderboard: fullBoard.slice(0, 10).map(({ id, username, score }) => ({ id, username, weeklyCalories: score })),
      currentUser: {
        rank: userIndex !== -1 ? userIndex + 1 : fullBoard.length + 1,
        weeklyCalories: userScore,
        weeklyReps: userWeeklyReps
      }
    };
  }

  /**
   * Get weekly reps leaderboard (Top 10 & Current User Rank)
   */
  async getRepsLeaderboard(currentUserId: number) {
    const fullBoard = await this.buildFullLeaderboardData((workouts) => workouts.reduce((sum, w) => sum + w.calories, 0));
    const userIndex = fullBoard.findIndex(u => u.id === currentUserId);
    const userScore = userIndex !== -1 ? fullBoard[userIndex].score : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const userWeeklyWorkouts = await this.workoutRepository.find({
      where: { 
        userId: currentUserId, 
        createdAt: MoreThanOrEqual(oneWeekAgo) 
      }
    });
    const userWeeklyCalories = userWeeklyWorkouts.reduce((sum, w) => sum + w.calories, 0);

    return {
      leaderboard: fullBoard.slice(0, 10).map(({ id, username, score }) => ({ id, username, weeklyReps: score })),
      currentUser: {
        rank: userIndex !== -1 ? userIndex + 1 : fullBoard.length + 1,
        weeklyCalories: userWeeklyCalories,
        weeklyReps: userScore
      }
    };
  }

  /**
   * Retrieve paginated workout history for a specific user
   */
  async getWorkoutHistory(userId: number, limit: number = 30, offset: number = 0) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return await this.workoutRepository.find({
      where: { 
        userId,
        createdAt: MoreThanOrEqual(oneYearAgo)
      },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Create a new user goal
   */
  async createGoal(userId: number, goalData: any) {
    const newGoal = this.goalsRepository.create({
      ...goalData,
      userId,
    });
    return await this.goalsRepository.save(newGoal);
  }

  /**
   * Retrieve and evaluate progress for active and past goals
   */
  async getUserGoals(userId: number) {
    const goals = await this.goalsRepository.find({ where: { userId } });
    const workouts = await this.workoutRepository.find({ where: { userId } });

    const todayStr = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];

    const active: any[] = [];
    const past: any[] = [];

    for (const goal of goals) {
      const isCalories = goal.goalType === 'CALORIES';
      const goalCreatedAtTime = new Date(goal.createdAt).getTime();
      
      const cleanGoalStart = goal.startDate.split('T')[0];
      const cleanGoalEnd = goal.endDate.split('T')[0];

      const normalizedSelectedDays = goal.selectedDays && Array.isArray(goal.selectedDays)
        ? goal.selectedDays.map((d: string) => d.toLowerCase())
        : [];

      let rawCurrentValue = 0;
      if (goal.periodType === 'DAILY') {
        const todayWorkouts = workouts.filter(w => {
          const cleanWorkoutDate = w.date.split('T')[0];
          const workoutCreatedAtTime = new Date(w.createdAt).getTime();
          
          const isToday = cleanWorkoutDate === todayStr && workoutCreatedAtTime >= goalCreatedAtTime;
          if (!isToday) return false;

          if (normalizedSelectedDays.length > 0) {
            const todayDayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
            return normalizedSelectedDays.some(d => d.includes(todayDayName) || todayDayName.includes(d));
          }
          return true;
        });
        rawCurrentValue = todayWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
      } else {
        const oneWeekAgo = new Date(todayStr);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const limitDate = oneWeekAgo.toISOString().split('T')[0];

        const weeklyWorkouts = workouts.filter(w => {
          const cleanWorkoutDate = w.date.split('T')[0];
          const workoutCreatedAtTime = new Date(w.createdAt).getTime();

          const isInDateRange = cleanWorkoutDate >= limitDate && 
                                cleanWorkoutDate >= cleanGoalStart && 
                                cleanWorkoutDate <= cleanGoalEnd;

          if (!isInDateRange) return false;
          if (cleanWorkoutDate === cleanGoalStart) {
            return workoutCreatedAtTime >= goalCreatedAtTime;
          }
          return true;
        });
        rawCurrentValue = weeklyWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
      }

      let currentProgressPercentage = 0;
      if (goal.targetValue > 0) {
        currentProgressPercentage = Math.round((rawCurrentValue / goal.targetValue) * 100);
        if (currentProgressPercentage > 100) currentProgressPercentage = 100;
      }

      let persistenceProgress = 0;
      const start = new Date(cleanGoalStart);
      const end = new Date(cleanGoalEnd);
      const today = new Date(todayStr);
      const currentEvaluationDate = today < end ? today : end;

      if (goal.periodType === 'DAILY') {
        const totalDaysElapsed = Math.floor((currentEvaluationDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        let targetDaysCount = 0;
        let successfulDays = 0;
        const dayNamesMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        for (let i = 0; i < totalDaysElapsed; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const currentDayStr = d.toISOString().split('T')[0];
          const currentDayName = dayNamesMap[d.getDay()];

          if (normalizedSelectedDays.length > 0) {
            const isSelected = normalizedSelectedDays.some(sd => sd.includes(currentDayName) || currentDayName.includes(sd));
            if (!isSelected) continue; 
          }
          targetDaysCount++;

          const dayWorkouts = workouts.filter(w => {
            const cleanWorkoutDate = w.date.split('T')[0];
            const workoutCreatedAtTime = new Date(w.createdAt).getTime();
            if (cleanWorkoutDate === cleanGoalStart) {
              return cleanWorkoutDate === currentDayStr && workoutCreatedAtTime >= goalCreatedAtTime;
            }
            return cleanWorkoutDate === currentDayStr;
          });

          const dayTotal = dayWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
          if (dayTotal >= goal.targetValue) successfulDays++;
        }
        persistenceProgress = targetDaysCount > 0 ? Math.round((successfulDays / targetDaysCount) * 100) : 0;
      } else {
        const totalDaysDiff = Math.floor((currentEvaluationDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const totalWeeksElapsed = Math.ceil(totalDaysDiff / 7);

        let evaluatedWeeks = 0;
        let successfulWeeks = 0;

        for (let weekIndex = 0; weekIndex < totalWeeksElapsed; weekIndex++) {
          const weekStart = new Date(start);
          weekStart.setDate(weekStart.getDate() + weekIndex * 7);

          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          const weekStartStr = weekStart.toISOString().split('T')[0];
          const weekEndStr = weekEnd.toISOString().split('T')[0];

          const isCurrentWeek = todayStr >= weekStartStr && todayStr <= weekEndStr;

          const weekWorkouts = workouts.filter(w => {
            const cleanWorkoutDate = w.date.split('T')[0];
            const workoutCreatedAtTime = new Date(w.createdAt).getTime();

            if (cleanWorkoutDate < weekStartStr || cleanWorkoutDate > weekEndStr) return false;
            if (cleanWorkoutDate === cleanGoalStart) {
              return workoutCreatedAtTime >= goalCreatedAtTime;
            }
            return true;
          });

          const weekTotal = weekWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
          const isWeekAchieved = weekTotal >= goal.targetValue;

          if (isWeekAchieved) {
            successfulWeeks++;
            evaluatedWeeks++;
          } else if (!isCurrentWeek) {
            evaluatedWeeks++;
          }
        }

        persistenceProgress = evaluatedWeeks > 0 ? Math.round((successfulWeeks / evaluatedWeeks) * 100) : 0;
      }

      const isCompleted = persistenceProgress >= 100;

      const formattedGoal = {
        ...goal,
        startDate: cleanGoalStart,
        endDate: cleanGoalEnd,
        currentProgress: currentProgressPercentage,
        persistenceProgress: persistenceProgress,
        isCompleted: isCompleted
      };

      if (todayStr <= cleanGoalEnd) {
        active.push(formattedGoal);
      } else {
        past.push(formattedGoal);
      }
    }

    active.sort((a, b) => b.startDate.localeCompare(a.startDate));
    past.sort((a, b) => b.startDate.localeCompare(a.startDate));

    return { active, past };
  }

  /**
   * Delete a goal by ID
   */
  async deleteGoal(userId: number, goalId: number) {
    const goal = await this.goalsRepository.findOne({ where: { id: goalId } });
    if (!goal) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }
    if (goal.userId !== userId) {
      throw new ForbiddenException('Unauthorized to delete this goal');
    }
    await this.goalsRepository.remove(goal);
    return { success: true, message: 'Goal deleted successfully' };
  }
}
