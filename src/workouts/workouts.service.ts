import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'; // הוספנו BadRequestException
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workout } from './workout.entity';
import { User } from '../users/entities/user.entity';
import { Goal } from './entities/goal.entity';
import { LessThanOrEqual, MoreThanOrEqual } from 'typeorm';

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
  // 1. שמירת אימון ועדכון התקדמות יעד באופן אוטומטי
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

    // שמירת האימון
    const newWorkout = this.workoutRepository.create({ 
      userId, 
      reps, 
      workoutType,
      duration,
      calories,
      date,
      day
    });
    const savedWorkout = await this.workoutRepository.save(newWorkout);

    // עדכון יעד פעיל במידה וקיים (לפי תאריך האימון הנוכחי)
    const activeGoal = await this.goalsRepository.findOne({
      where: [
        {
          userId,
          startDate: LessThanOrEqual(date),
          endDate: MoreThanOrEqual(date),
        }
      ]
    });

    if (activeGoal) {
      // הוספת הערך הרלוונטי לפי סוג היעד
      if (activeGoal.goalType === 'CALORIES') {
        activeGoal.currentProgress += calories;
      } else if (activeGoal.goalType === 'DURATION') {
        activeGoal.currentProgress += duration;
      }
      
      await this.goalsRepository.save(activeGoal);
    }

    return savedWorkout;
  }
  // 2. שליפת סטטיסטיקות
  async getUserStats(userId: number) {
    const workouts = await this.workoutRepository.find({ where: { userId } });
    const totalWorkouts = workouts.length;
    const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0);

    return { userId, totalWorkouts, totalReps };
  }

  // 3. לוח שיאים
  async getLeaderboard() {
    const users = await this.userRepository.find();
    const leaderboard = await Promise.all(
      users.map(async (user) => {
        const count = await this.workoutRepository.count({ where: { userId: user.id } });
        return { username: user.username, workoutCount: count };
      })
    );

    return leaderboard.sort((a, b) => b.workoutCount - a.workoutCount);
  }

  // 4. שליפת היסטוריית אימונים
  async getWorkoutHistory(userId: number) {
    return await this.workoutRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // 5. יצירת יעד חדש ומניעת חפיפות
  async createGoal(userId: number, goalData: any) {
    const overlappingGoal = await this.goalsRepository.findOne({
      where: [
        {
          userId,
          startDate: LessThanOrEqual(goalData.endDate),
          endDate: MoreThanOrEqual(goalData.startDate),
        }
      ]
    });

    if (overlappingGoal) {
      throw new BadRequestException('קיימת כבר חפיפת זמנים עם יעד אחר בתקופה זו');
    }

    const newGoal = this.goalsRepository.create({
      ...goalData,
      userId,
      currentProgress: 0
    });

    return await this.goalsRepository.save(newGoal);
  }

  // 6. שליפת כל היעדים של המשתמש - מסודר מהחדש לישן לפי תאריך ההתחלה
  async getUserGoals(userId: number) {
    return await this.goalsRepository.find({
      where: { userId },
      order: { startDate: 'DESC' }, // החדש למעלה, הישן למטה
    });
  }
}
