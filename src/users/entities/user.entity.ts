import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  username!: string;

  @Column({ nullable: true, type: 'varchar'})
  resetCode!: string | null;

  @Column({ nullable: true, type: 'varchar'})
  resetTokenExpiresAt!: Date | null;

}