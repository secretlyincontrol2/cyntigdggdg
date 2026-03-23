import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/prismaClient';

interface DecodedToken {
    id: string;
    iat: number;
    exp: number;
}

// Extend Request interface
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as DecodedToken;

            // Get user from the token using Prisma
            const user = await prisma.user.findUnique({
                where: { id: decoded.id }
            });

            if (!user) {
                res.status(401).json({ message: 'Not authorized, user not found' });
                return;
            }

            // Exclude password from req.user
            const { password, ...userWithoutPassword } = user;
            req.user = userWithoutPassword;

            next();
        } catch (error) {
            console.error(error);
            res.status(401).json({ message: 'Not authorized' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};
