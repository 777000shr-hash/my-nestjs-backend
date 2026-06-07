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
    const formattedDate = oneWeekAgo.toISOString().split('T')[0];
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

    // תיקון: חישוב תאריך נוכחי מדויק לפי שעון ישראל (UTC+3) ללא תלות באימונים ישנים/עתידיים
    const todayStr = new Date(new Date().getTime() + 3 * 60 * 60 * 1000).toISOString().split('T')[0];

    const active: any[] = [];
    const past: any[] = [];

    for (const goal of goals) {
      const isCalories = goal.goalType === 'CALORIES';
      
      // א. חישוב התקדמות נקודתית (currentProgress)
      let currentProgress = 0;
      if (goal.periodType === 'DAILY') {
        const todayWorkouts = workouts.filter(w => w.date === todayStr);
        currentProgress = todayWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
      } else {
        // שבועי
        const oneWeekAgo = new Date(todayStr);
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const limitDate = oneWeekAgo.toISOString().split('T')[0];
        const weeklyWorkouts = workouts.filter(w => w.date >= limitDate && w.date >= goal.startDate && w.date <= goal.endDate);
        currentProgress = weeklyWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
      }

      // ב. חישוב התמדה כללית (persistenceProgress) לפי ימים נבחרים
      let persistenceProgress = 0;
      const start = new Date(goal.startDate);
      const end = new Date(goal.endDate);
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

          // סינון לפי הימים שהמשתמש בחר ביעד
          if (goal.selectedDays && goal.selectedDays.length > 0) {
            if (!goal.selectedDays.includes(currentDayName)) {
              continue; 
            }
          }

          targetDaysCount++;

          const dayWorkouts = workouts.filter(w => w.date === currentDayStr);
          const dayTotal = dayWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
          if (dayTotal >= goal.targetValue) {
            successfulDays++;
          }
        }

        persistenceProgress = targetDaysCount > 0 
          ? Math.round((successfulDays / targetDaysCount) * 100) 
          : 0;

      } else {
        // שבועי
        const totalWeeksElapsed = goal.durationWeeks || 1;
        let successfulWeeks = 0;
        
        for (let i = 0; i < totalWeeksElapsed; i++) {
          const wStart = new Date(start);
          wStart.setDate(wStart.getDate() + (i * 7));
          const wEnd = new Date(wStart);
          wEnd.setDate(wEnd.getDate() + 7);

          if (wStart > today) break;

          const weekWorkouts = workouts.filter(w => {
            const d = new Date(w.date);
            return d >= wStart && d < wEnd;
          });
          const weekTotal = weekWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
          if (weekTotal >= goal.targetValue) successfulWeeks++;
        }
        persistenceProgress = Math.round((successfulWeeks / totalWeeksElapsed) * 100);
      }

      const formattedGoal = {
        ...goal,
        currentProgress,
        persistenceProgress: `${persistenceProgress}%`
      };

      // תיקון: חיתוך והשוואת תאריכים נקייה בפורמט YYYY-MM-DD למניעת שגיאות איתור
      const cleanToday = todayStr.split('T')[0];
      const cleanEndDate = goal.endDate.split('T')[0];

      if (cleanToday <= cleanEndDate) {
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
