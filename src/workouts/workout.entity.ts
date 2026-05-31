import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/entities/user.entity'; // הנתיב המדויק שמצאנו עכשיו!

@Entity('workouts')
export class Workout {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  reps: number;

  @Column()
  workoutType: string;

  @CreateDateColumn()
  createdAt: Date;

  // מקשר קבוע בין אימון למשתמש בבסיס הנתונים
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
