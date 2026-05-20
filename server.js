"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const client_1 = require("@prisma/client");
// אתחול יחיד של פריזמה בראש הקובץ הראשי
const prisma = new client_1.PrismaClient();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// פונקציית העזר ליצירת משתמש (הייתה ב-userService)
async function createUser(username, email, password) {
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
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Failed to create user" });
    }
});
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
