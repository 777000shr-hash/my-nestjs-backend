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

  // מנגנון עזר משותף לשוברי שוויון בלוח השיאים
  private async getLeaderboardBase(metricExtractor: (workouts: Workout[]) => number) {
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

    // מיון לפי הציון הגבוה, ובמקרה של שוויון לפי תאריך יצירת האימון האחרון
    return leaderboard
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return b.lastWorkoutTime - a.lastWorkoutTime;
      })
      .slice(0, 5)
      .map(({ id, username, score }) => ({ id, username, value: score }));
  }

  // 3א. לוח שיאים - קלוריות
  async getCaloriesLeaderboard() {
    const board = await this.getLeaderboardBase((workouts) => workouts.reduce((sum, w) => sum + w.calories, 0));
    return board.map(u => ({ id: u.id, username: u.username, weeklyCalories: u.value }));
  }

  // 3ב. לוח שיאים - חזרות
  async getRepsLeaderboard() {
    const board = await this.getLeaderboardBase((workouts) => workouts.reduce((sum, w) => sum + w.reps, 0));
    return board.map(u => ({ id: u.id, username: u.username, weeklyReps: u.value }));
  }

  // 4. שליפת היסטוריית אימונים
  async getWorkoutHistory(userId: number) {
    return await this.workoutRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // 5. יצירת יעד חדש ללא חסימת חפיפות
  async createGoal(userId: number, goalData: any) {
    const todayStr = new Date().toISOString().split('T')[0];
    
    // אכיפת שבועות עגולים במידה ונבחר שבועי
    if (goalData.periodType === 'WEEKLY' && goalData.durationWeeks) {
      const daysNeeded = goalData.durationWeeks * 7;
      const end = new Date();
      end.setDate(end.getDate() + daysNeeded);
      goalData.endDate = end.toISOString().split('T')[0];
    }

    const newGoal = this.goalsRepository.create({
      ...goalData,
      userId,
      startDate: todayStr, // מוגדר תמיד מהרגע הנוכחי
    });

    return await this.goalsRepository.save(newGoal);
  }

  // 6. שליפת יעדים וחישוב התקדמות כפול דינמי בזמן אמת
  async getUserGoals(userId: number) {
    const goals = await this.goalsRepository.find({ where: { userId } });
    const workouts = await this.workoutRepository.find({ where: { userId } });
    const todayStr = new Date().toISOString().split('T')[0];

    const active: [] = [];
    const past: [] = [];

    for (const goal of goals) {
      const isCalories = goal.goalType === 'CALORIES';
      
      // א. חישוב התקדמות נקודתית (currentProgress)
      let currentProgress = 0;
      if (goal.periodType === 'DAILY') {
        const todayWorkouts = workouts.filter(w => w.date === todayStr);
        currentProgress = todayWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
      } else {
        // שבועי - סכימת השבוע הנוכחי בתוך טווח היעד
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const limitDate = oneWeekAgo.toISOString().split('T')[0];
        const weeklyWorkouts = workouts.filter(w => w.date >= limitDate && w.date >= goal.startDate && w.date <= goal.endDate);
        currentProgress = weeklyWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
      }

      // ב. חישוב התמדה כללית (persistenceProgress)
      let persistenceProgress = 0;
      const start = new Date(goal.startDate);
      const end = new Date(goal.endDate);
      const today = new Date(todayStr);
      const currentEvaluationDate = today < end ? today : end;

      if (goal.periodType === 'DAILY') {
        let totalDaysElapsed = Math.floor((currentEvaluationDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (totalDaysElapsed < 1) totalDaysElapsed = 1;
        
        let successfulDays = 0;
        for (let i = 0; i < totalDaysElapsed; i++) {
          const d = new Date(start);
          d.setDate(d.getDate() + i);
          const currentDayStr = d.toISOString().split('T')[0];
          
          const dayWorkouts = workouts.filter(w => w.date === currentDayStr);
          const dayTotal = dayWorkouts.reduce((sum, w) => sum + (isCalories ? w.calories : w.reps), 0);
          if (dayTotal >= goal.targetValue) successfulDays++;
        }
        persistenceProgress = Math.round((successfulDays / totalDaysElapsed) * 100);
      } else {
        // שבועי
        const totalWeeksElapsed = goal.durationWeeks || 1;
        let successfulWeeks = 0;
        
        for (let i = 0; i < totalWeeksElapsed; i++) {
          const wStart = new Date(start);
          wStart.setDate(wStart.getDate() + (i * 7));
          const wEnd = new Date(wStart);
          wEnd.setDate(wEnd.getDate() + 7);

          if (wStart > today) break; // השבוע עוד לא התחיל

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

      if (todayStr <= goal.endDate) {
        active.push(formattedGoal);
      } else {
        past.push(formattedGoal);
      }
    }

    // מיון פנימי מהחדש לישן
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
