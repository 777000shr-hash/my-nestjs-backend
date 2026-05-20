 import { addWorkout } from './workoutService';

console.log("--- התחלנו את הבדיקה ---");

// שימי לב שאנחנו קוראים לפונקציה ישירות
addWorkout(1, 50, "Pushups")
    .then((res) => {
        console.log("מעולה! זה עבד. הנה הנתון שנשמר:");
        console.log(res);
    })
    .catch((err) => {
        console.error("שגיאה בביצוע הפעולה:");
        console.error(err);
    })
    .finally(() => {
        console.log("--- הבדיקה הסתיימה ---");
    }); 
