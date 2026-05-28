import { Module } from '@nestjs/common';
import { WorkoutsController } from './workouts.controller';
import { WorkoutsService } from './workouts.service';
import { PrismaModule } from '../prisma/prisma.module'; // מייבא את החיבור לפריזמה

@Module({
  imports: [PrismaModule], // מאפשר ל-Service להשתמש בפריזמה
  controllers: [WorkoutsController],
  providers: [WorkoutsService],
})
export class WorkoutsModule {}
