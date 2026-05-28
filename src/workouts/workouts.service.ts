import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workout } from './workout.entity';
import { User } from '../users/user.entity';

@Injectable()
export class WorkoutsService {
  constructor(
    @InjectRepository(Workout)
    private readonly workoutRepository: Repository<Workout>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // 1. שמירת אימון אמיתי בבסיס הנתונים
  async addWorkout(userId: number, reps: number, workoutType: string) {
    const userExists = await this.userRepository.findOne({ where: { id: userId } });
    if (!userExists) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const newWorkout = this.workoutRepository.create({ userId, reps, workoutType });
    return await this.workoutRepository.save(newWorkout);
  }

  // 2. שליפת סטטיסטיקות אמיתיות מה-DB
  async getUserStats(userId: number) {
    const workouts = await this.workoutRepository.find({ where: { userId } });
    const totalWorkouts = workouts.length;
    const totalReps = workouts.reduce((sum, w) => sum + w.reps, 0);

    return { userId, totalWorkouts, totalReps };
  }

  // 3. לוח שיאים אמיתי לפי כמות אימונים
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
}
