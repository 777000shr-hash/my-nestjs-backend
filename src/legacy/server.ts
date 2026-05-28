import express from 'express';
import { PrismaClient } from '@prisma/client';

// אתחול יחיד של פריזמה בראש הקובץ הראשי
const prisma = new PrismaClient();

const app = express();
app.use(express.json());

// פונקציית העזר ליצירת משתמש (הייתה ב-userService)
async function createUser(username: string, email: string, password: string) {
    return await prisma.user.create({
        data: {
            username,
            email,
            password
        }
    });
}

// בדיקת תקינות בסיסית
app.get('/', (req, res) => {
    res.send('השרת פועל בהצלחה!');
});

// רישום משתמש
app.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const newUser = await createUser(username, email, password);
        res.status(201).json(newUser);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create user" });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});