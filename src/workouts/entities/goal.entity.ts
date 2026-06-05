import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', nullable: true })
  goalType: 'CALORIES' | 'REPS'; // סוג היעד

  @Column({ type: 'varchar', nullable: true })
  periodType: 'DAILY' | 'WEEKLY'; // מחזוריות היעד

  @Column({ type: 'int', nullable: true })
  durationWeeks: number; // מספר שבועות עגול

  @Column({ type: 'int', default: 0 })
  targetValue: number; // ערך היעד

  @Column({ type: 'varchar', nullable: true })
  startDate: string; // תאריך התחלה

  @Column({ type: 'varchar', nullable: true })
  endDate: string; // תאריך סיום

  @CreateDateColumn()
  createdAt: Date;

  // שדות תאימות לאחור כדי למנוע קריסה של פוסטגרס מול עמודות ישנות בטבלה
  @Column({ type: 'varchar', nullable: true })
  timeFrame: string;

  @Column({ type: 'float', nullable: true, default: 0 })
  currentProgress: number;
}
