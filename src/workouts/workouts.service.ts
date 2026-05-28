import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // מוודא חיבור לפריזמה שלכן

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. שמירת אימון חדש בבסיס הנתונים
  async addWorkout(userId: number, reps: number, workoutType: string) {
    // בדיקה שהמשתמש קיים במערכת לפני שיוצרים לו אימון
    const userExists = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!userExists) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return this.prisma.workout.create({
      data: {
        userId,
        reps,
        workoutType,
      },
    });
  }

  // 2. חישוב סטטיסטיקות: סך הכל אימונים וסך הכל חזרות (Reps)
  async getUserStats(userId: number) {
    const workouts = await this.prisma.workout.findMany({
      where: { userId },
    });

    const totalWorkouts = workouts.length;
    const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0);

    return {
      userId,
      totalWorkouts,
      totalReps,
    };
  }

  // 3. לוח שיאים: מציג משתמשים ממוינים לפי כמות האימונים שלהם מהגבוה לנמוך
  async getLeaderboard() {
    // מביא את המשתמשים יחד עם רשימת האימונים שלהם
    const users = await this.prisma.user.findMany({
      include: { workouts: true },
    });

    const leaderboard = users.map(user => ({
      username: user.username,
      workoutCount: user.workouts.length,
    }));

    // מיון מהגבוה לנמוך
    return leaderboard.sort((a, b) => b.workoutCount - a.workoutCount);
  }
}
