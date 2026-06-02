import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('goals')
export class Goal {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column({ type: 'varchar' }) // 'DAILY' או 'WEEKLY'
  timeFrame: string;

  @Column({ type: 'varchar' }) // שונה מ-'date' ל-'varchar' בשביל תאימות מלאה לפוסטגרס
  startDate: string;

  @Column({ type: 'varchar' }) // שונה מ-'date' ל-'varchar' בשביל תאימות מלאה לפוסטגרס
  endDate: string;

  @Column({ type: 'varchar' }) // 'CALORIES' או 'DURATION'
  goalType: string;

  @Column({ type: 'float' })
  targetValue: number;

  @Column({ type: 'float', default: 0 })
  currentProgress: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;
}
