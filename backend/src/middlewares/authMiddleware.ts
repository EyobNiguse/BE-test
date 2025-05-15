import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from "dotenv";
dotenv.config();
export interface AuthenticatedRequest extends Request {
    user?: any;
}
export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    let token;
    if (req.cookies?.token) {
        token = req.cookies?.token;
    }

    if (!token) {
        res.status(401).json({ message: 'Authentication token not found' });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ message: 'Invalid or expired token' });
        return;

    }
};
