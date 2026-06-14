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
        // סינון קשוח מול מסד הנתונים שחוסך שליפת אימונים ישנים
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
          const cleanWorkoutDate = w.date.split('T')
