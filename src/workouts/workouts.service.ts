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
  } else if (activeGoal.goalType === 'REPS') {
    activeGoal.currentProgress += reps; // הוספת חזרות במקום דקות
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
  const totalCalories = workouts.reduce((sum, w) => sum + w.calories, 0); // הוספת חישוב קלוריות

  return { userId, totalWorkouts, totalReps, totalCalories };
}

  // 3. לוח שיאים
  async getLeaderboard() {
  // חישוב תאריך של לפני שבוע מהיום
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const formattedDate = oneWeekAgo.toISOString().split('T')[0]; // פורמט YYYY-MM-DD

  const users = await this.userRepository.find();
  
  const leaderboard = await Promise.all(
    users.map(async (user) => {
      // שליפת כל האימונים של המשתמש מהשבוע האחרון
      const weeklyWorkouts = await this.workoutRepository.find({
        where: { 
          userId: user.id,
          date: MoreThanOrEqual(formattedDate)
        }
      });

      // סכימת החזרות של המשתמש בשבוע זה
      const totalWeeklyReps = weeklyWorkouts.reduce((sum, w) => sum + w.reps, 0);

      return { 
        id: user.id, // הוספת id המשתמש לבקשת אתי
        username: user.username, 
        weeklyReps: totalWeeklyReps 
      };
    })
  );

  // סינון משתמשים ללא חזרות בכלל, מיון מהגבוה לנמוך, ולקיחת 5 המובילים בלבד
  return leaderboard
    .filter(user => user.weeklyReps > 0)
    .sort((a, b) => b.weeklyReps - a.weeklyReps)
    .slice(0, 5);
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
