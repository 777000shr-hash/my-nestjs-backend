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

  // מנגנון עזר משותף לבניית לוח השיאים הכללי
  private async buildFullLeaderboardData(metricExtractor: (workouts: Workout[]) => number) {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const formattedDate = oneWeekAgo.toISOString().split('T')[0];

    const users = await this.userRepository.find();
    
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const weeklyWorkouts = await this.workoutRepository.find({
          where: { userId: user.id, date: MoreThanOrEqual(formattedDate) },
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

  // 3א. לוח שיאים - קלוריות (Top 10 + אובייקט מעטפת למשתמש המחובר)
  async getCaloriesLeaderboard(currentUserId: number) {
    const fullBoard = await this.buildFullLeaderboardData((workouts) => workouts.reduce((sum, w) => sum + w.calories, 0));
    const userIndex = fullBoard.findIndex(u => u.id === currentUserId);
    const userScore = userIndex !== -1 ? fullBoard[userIndex].score : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const formattedDate = oneWeekAgo.toISOString().split('T')[0];
    const userWeeklyWorkouts = await this.workoutRepository.find({
      where: { userId: currentUserId, date: MoreThanOrEqual(formattedDate) }
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

  // 3ב. לוח שיאים - חזרות (Top 10 + אובייקט מעטפת למשתמש המחובר)
  async getRepsLeaderboard(currentUserId: number) {
    const fullBoard = await this.buildFullLeaderboardData((workouts) => workouts.reduce((sum, w) => sum + w.reps, 0));
    const userIndex = fullBoard.findIndex(u => u.id === currentUserId);
    const userScore = userIndex !== -1 ? fullBoard[userIndex].score : 0;

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const formattedDate = new Date().toISOString().split('T')[0];
    const userWeeklyWorkouts = await this.workoutRepository.find({
      where: { userId: currentUserId, date: MoreThanOrEqual(formattedDate) }
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

  // 4. שליפת היסטוריית אימונים
  async getWorkoutHistory(userId: number) {
    return await this.workoutRepository.find({
      where: { userId },
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

    // תאריך נוכחי נקי בישראל (YYYY-MM-DD)
    const todayStr = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];

    const active: any[] = [];
    const past: any[] = [];

    for (const goal of goals) {
      const isCalories = goal.goalType === 'CALORIES';
      const goalCreatedAtTime = new Date(goal.createdAt).getTime();
      
      const cleanGoalStart = goal.startDate.split('T')[0];
      const cleanGoalEnd = goal.endDate.split('T')[0];

      // א. חישוב התקדמות נקודתית (currentProgress)
      let currentProgress = 0;
      if (goal.periodType === 'DAILY') {
        const todayWorkouts = workouts.filter(w => {
          const cleanWorkoutDate = w.date.split('T')[0];
          const workoutCreatedAtTime = new Date(w.createdAt).getTime();
          return cleanWorkoutDate === todayStr && workoutCreatedAtTime >= goalCreatedAtTime;
        });
        currentProgress = todayWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
      } else {
        // שבועי
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
        currentProgress = weeklyWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
      }

      // חסימת הציון המספרי של החזרות שלא יעקוף את היעד עצמו
      let displayProgress = currentProgress;
      if (goal.targetValue > 0 && displayProgress > goal.targetValue) {
        displayProgress = goal.targetValue;
      }

      // ב. חישוב אחוזי התקדמות (persistenceProgress)
      let persistenceProgress = 0;
      if (goal.targetValue > 0) {
        persistenceProgress = Math.round((currentProgress / goal.targetValue) * 100);
        if (persistenceProgress > 100) {
          persistenceProgress = 100;
        }
      }

      // נרמול שדות התאריך המוחזרים כדי למנוע בעיות תצוגה וכפתורים חסומים באתר
      const formattedGoal = {
        ...goal,
        startDate: cleanGoalStart,
        endDate: cleanGoalEnd,
        currentProgress: displayProgress,
        persistenceProgress: persistenceProgress
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
