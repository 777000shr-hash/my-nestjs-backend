import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne } from 'typeorm';
import { User } from '../users/entities/user.entity';

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

  @Column({ type: 'float', nullable: true })
  duration: number;

  @Column({ type: 'float', nullable: true })
  calories: number;

  @Column({ nullable: true })
  date: string;

  @Column({ nullable: true })
  day: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
