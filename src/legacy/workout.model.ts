// זהו הקוד שמתאר ל-Node.js איך נראית הטבלה בבסיס הנתונים
export class WorkoutModel {
    id: number;
    userId: number;
    workoutType: string;
    reps: number;
    durationSeconds: number;
    caloriesBurned: number;
    createdAt: Date;

    constructor(data: any) {
        this.id = data.id;
        this.userId = data.user_id;
        this.workoutType = data.workout_type;
        this.reps = data.reps;
        this.durationSeconds = data.duration_seconds;
        this.caloriesBurned = data.calories_burned;
        this.createdAt = data.created_at;
    }
}