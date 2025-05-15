import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists" });
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const user = new User({
            email,
            password: hashedPassword
        });

        await user.save();

        res.status(201).json({ message: "User registered successfully" });
        return;
    } catch (error) {
        res.status(500).json({ message: "Server error" });
        return;
    }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }


        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            res.status(401).json({ message: "Invalid credentials" });
            return;
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "", { expiresIn: "1h" });

        res.cookie("token", token, {
            httpOnly: true, // Prevent access to cookie via JavaScript
            secure: process.env.NODE_ENV === "production", // Use secure cookies in production
            sameSite: "strict", // Cookie will only be sent in a first-party context (default same-site policy)
            maxAge: 120000, // Set cookie expiration  in milliseconds
        });
        res.status(200).json({ message: "login success" });
        return;
    } catch (error) {
        res.status(500).json({ message: "Server error" });
        return;
    }
};
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out successfully" });
    return;
};


