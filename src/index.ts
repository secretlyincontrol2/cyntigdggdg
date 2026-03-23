import dotenv from 'dotenv';
dotenv.config();

import app from './app';
import prisma from './config/prismaClient';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('PostgreSQL Connected via Prisma ✅');

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
};

startServer();
