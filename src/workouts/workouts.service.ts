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

  // 1. שמירת אימון
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

  // 2. שליפת סטטיסטיקות
  async getUserStats(userId: number) {
    const workouts = await this.workoutRepository.find({ where: { userId } });
    const totalWorkouts = workouts.length;
    const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0);
    const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0);

    return { userId, totalWorkouts, totalReps, totalCalories };
  }

  // מנגנון עזר משותף לבניית לוח השיאים הכללי - מסונן לפי שבוע דינמי אמיתי (createdAt)
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

    return leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return b.lastWorkoutTime - a.lastWorkoutTime;
    });
  }

  // 3א. לוח שיאים - קלוריות
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

  // 3ב. לוח שיאים - חזרות
  async getRepsLeaderboard(currentUserId: number) {
    const fullBoard = await this.buildFullLeaderboardData((workouts) => workouts.reduce((sum, w) => sum + w.reps, 0));
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

  // 4. שליפת היסטוריית אימונים - מסונן לשנה האחרונה בלבד
  async getWorkoutHistory(userId: number) {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    return await this.workoutRepository.find({
      where: { 
        userId,
        createdAt: MoreThanOrEqual(oneYearAgo)
      },
      order: { createdAt: 'DESC' },
    });
  }

  // 5. יצירת יעד חדש
  async createGoal(userId: number, goalData: any) {
    const newGoal = this.goalsRepository.create({
      ...goalData,
      userId,
    });
    return await this.goalsRepository.save(newGoal);
  }

  // 6. קבלת היעדים וחישוב התקדמות דינמי ומדויק בזמן אמת
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

      let rawCurrentValue = 0;
      if (goal.periodType === 'DAILY') {
        const todayWorkouts = workouts.filter(w => {
          const cleanWorkoutDate = w.date.split('T')[0];
          const workoutCreatedAtTime = new Date(w.createdAt).getTime();
          return cleanWorkoutDate === todayStr && workoutCreatedAtTime >= goalCreatedAtTime;
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
        const dayNamesMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        for (let i = 0; i < totalDaysElapsed; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const currentDayStr = d.toISOString().split('T')[0];
          const currentDayName = dayNamesMap[d.getDay()];

          if (goal.selectedDays && goal.selectedDays.length > 0) {
            if (!goal.selectedDays.includes(currentDayName)) continue; 
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
        persistenceProgress = currentProgressPercentage;
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

      if (todayStr <= cleanGoalEnd && !isCompleted) {
        active.push(formattedGoal);
      } else {
        past.push(formattedGoal);
      }
    }

    active.sort((a, b) => b.startDate.localeCompare(a.startDate));
    past.sort((a, b) => b.startDate.localeCompare(a.startDate));

    return { active, past };
  }

  // 7. מחיקת יעד אישי
  async deleteGoal(userId: number, goalId: number) {
    const goal = await this.goalsRepository.findOne({ where: { id: goalId } });
    if (!goal) {
      throw new NotFoundException(`Goal with ID ${goalId} not found`);
    }
    if (goal.userId !== userId) {
      throw new ForbiddenException('אינך מורשה למחוק יעד זה');
    }
    await this.goalsRepository.remove(goal);
    return { success: true, message: 'היעד נמחק בהצלחה' };
  }
}
