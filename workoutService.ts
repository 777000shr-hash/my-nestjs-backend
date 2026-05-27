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

    export async function getUserStats(userId: number) {
  try {
    // 1. שליפת כל האימונים השייכים למשתמש הספציפי
    const userWorkouts = await prisma.workout.findMany({
      where: {
        userId: userId,
      },
    });

    // 2. חישוב סך הכל אימונים וסך הכל קלוריות
    const totalWorkouts = userWorkouts.length;
    
    const totalCalories = userWorkouts.reduce((sum, workout) => {
      return sum + (workout.caloriesBurned || 0);
    }, 0);

    // 3. החזרת התוצאה המדויקת
    return {
      totalWorkouts,
      totalCalories,
    };
  } catch (error) {
    console.error("שגיאה בחישוב סטטיסטיקות למשתמש:", error);
    throw error;
  }
}

  export async function getLeaderboard() {
  try {
    // שליפת המשתמשים עם סיכום כמות האימונים שלהם, ממוינים מהגבוה לנמוך
    const leaderboard = await prisma.workout.groupBy({
      by: ['userId'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10, // הצגת 10 המובילים בלבד
    });

    return leaderboard;
  } catch (error) {
    console.error("שגיאה בשליפת לוח השיאים:", error);
    throw error;
  }
}

}