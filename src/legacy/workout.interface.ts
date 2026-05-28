// זהו המבנה של נתוני אימון כפי שהם יעברו בין כל חברות הצוות
export interface Workout {
    id?: string;           // מזהה ייחודי שייווצר במסד הנתונים
    userId: string;       // מזהה המשתמש שביצע את האימון
    workoutType: string;  // סוג האימון (למשל: סקוואט, קפיצות)
    reps: number;         // מספר חזרות שזוהו ע"י ה-AI
    duration: number;     // משך זמן האימון בשניות
    calories: number;     // חישוב הקלוריות שנשרפו
    createdAt: Date;      // תאריך ושעה של ביצוע האימון
  }
  
  // זהו המבנה של יעד אישי (Goal)
  export interface PersonalGoal {
    id?: string;
    userId: string;
    goalType: string;     // למשל: "צריכת קלוריות שבועית"
    targetValue: number;  // מה היעד (למשל: 500)
    currentValue: number; // כמה המשתמש השיג עד עכשיו
    deadline: Date;       // עד מתי צריך להשלים את היעד
  }