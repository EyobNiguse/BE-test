import express from "express";

import { login, logout, register } from "../controllers/authController";
const router = express.Router();

// Register route
router.post("/register", register);

// Login route
router.post("/login", login);

router.post("/logout", logout);

export default router;