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
  goalType: 'CALORIES' | 'REPS';

  @Column({ type: 'varchar', nullable: true })
  periodType: 'DAILY' | 'WEEKLY';

  @Column({ type: 'int', nullable: true })
  durationWeeks: number;

  @Column({ type: 'int', default: 0 })
  targetValue: number;

  @Column({ type: 'varchar', nullable: true })
  startDate: string; // מקבל תאריך ישירות מהפרונט

  @Column({ type: 'varchar', nullable: true })
  endDate: string; // מקבל תאריך ישירות מהפרונט (בוטל החישוב האוטומטי)

  @Column({ type: 'json', nullable: true })
  selectedDays: string[]; // מערך הימים הנבחרים ליעד יומי

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: 'varchar', nullable: true })
  timeFrame: string;

  @Column({ type: 'float', nullable: true, default: 0 })
  currentProgress: number;
}
