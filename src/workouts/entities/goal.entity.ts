import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity'; // ודאי שהנתיב לישות המשתמש נכון עבורך

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar' })
  goalType: 'CALORIES' | 'REPS'; // סוג היעד: קלוריות או חזרות

  @Column({ type: 'varchar' })
  periodType: 'DAILY' | 'WEEKLY'; // מחזוריות היעד

  @Column({ type: 'int', nullable: true })
  durationWeeks: number; // רלוונטי רק אם נבחר WEEKLY (מספר שבועות עגול)

  @Column({ type: 'int' })
  targetValue: number; // ערך היעד (למשל 50 קלוריות ביום או 500 חזרות בשבוע)

  @Column({ type: 'date' })
  startDate: string; // תמיד תאריך היצירה הנוכחי

  @Column({ type: 'date' })
  endDate: string; // תאריך הסיום המחושב/נבחר

  @CreateDateColumn()
  createdAt: Date;
}
