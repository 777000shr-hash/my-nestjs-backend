import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
/**
 * פונקציה להוספת אימון חדש
 */
export async function addWorkout(userId: number, reps: number, workoutType: string) {
    // הוראה ל-Prisma: צור שורה חדשה בטבלת האימונים
    const newWorkout = await prisma.workout.create({
        data: {
            // @ts-ignore
            userId: userId,
            reps: reps,
            workoutType: workoutType,
            durationSeconds: 0,
            caloriesBurned: 0
        }
    });

    console.log("אימון חדש נשמר בהצלחה:", newWorkout);
    return newWorkout;
}