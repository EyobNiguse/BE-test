import express from "express";
import { getAllFiles, handleDownload, handleUpload } from "../controllers/fileController";
import { progressMiddleware } from "../middlewares/progress";
import { authenticate } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/", authenticate, progressMiddleware, handleUpload as any);

router.get("/:resultName", authenticate, handleDownload as any);

router.get("/", authenticate, getAllFiles);

export default router;
