import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function createUser(username: string, email: string, password: string) {
    try {
        const newUser = await prisma.user.create({
            data: {
                username: username,
                email: email,
                password: password,
            },
        });
        console.log("משתמש חדש נוצר בהצלחה:", newUser.username);
        return newUser;
    } catch (error) {
        console.error("שגיאה ביצירת משתמש:", error);
        throw error;
    }
}