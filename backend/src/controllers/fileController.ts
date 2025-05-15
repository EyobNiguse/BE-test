import { Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { UploadMetadata, Range, MulterRequest } from "../types";
import { redis } from "../config/redis";
import { fileURLToPath } from "url";
import { Types } from "mongoose";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../../uploads");
import { v4 as uuidv4 } from "uuid";
import winston from "winston";
import { parseRange } from "../utils/range";
import FileModel, { IFile } from "../models/File";
import { AuthenticatedRequest } from "../middlewares/authMiddleware";
import { enqueueAggregatingJob } from "../queues/process.queue";
const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

const storage = multer.diskStorage({
    destination: async (
        req: Request,
        file: Express.Multer.File,
        cb: (error: Error | null, destination: string) => void
    ) => {
        try {
            const uploadDir = path.join(__dirname, "../../uploads");
            await fs.mkdir(uploadDir, { recursive: true });
            logger.info(`Upload directory: ${uploadDir}`);
            cb(null, uploadDir);
        } catch (error) {
            logger.error(`Error creating upload directory: ${error}`);
            cb(error as Error, "");
        }
    },
    filename: (
        req: MulterRequest,
        file: Express.Multer.File,
        cb: (error: Error | null, filename: string) => void
    ) => {
        try {
            // For chunks, use a temporary filename pattern
            const range = parseRange(req.headers["content-range"] as string);
            const isChunk = !!range;

            let uniqueName;
            if (isChunk) {
                // For chunks, use a temporary name that includes the range
                uniqueName = `${req.uploadId || uuidv4()}-chunk-${range.start}-${range.end
                    }-${file.originalname}`;
            } else {
                // For complete files, use the normal pattern
                uniqueName = `${req.uploadId || uuidv4()}-${file.originalname}`;
            }

            logger.info(`Generated filename: ${uniqueName}, isChunk: ${isChunk}`);
            cb(null, uniqueName);
        } catch (error) {
            logger.error(`Error generating filename: ${error}`);
            cb(error as Error, "");
        }
    },
});
// Update the upload limits to handle large files
const upload = multer({
    storage,
    limits: {
        fileSize: 1024 * 1024 * 1024 * 2, // 2GB limit
        files: 1,
    },
}).single("file");


export const handleUpload = async (
    req: MulterRequest,
    res: Response,
    next: NextFunction
): Promise<void> => {

    try {
        // Process the upload with multer
        await new Promise<void>((resolve, reject) => {
            upload(req, res, (err) => {
                if (err) {
                    logger.error(`Multer upload error: ${err}`);
                    reject(err);
                    return;
                }
                resolve();
            });
        });

        if (!req.file) {
            logger.error("No file uploaded");
            res.status(400).json({ error: "No file uploaded" });
            return;
        }


        logger.info(
            `File uploaded: ${req.file.originalname}, size: ${req.file.size}, path: ${req.file.path}`
        );

        // Parse content range header
        const range = parseRange(req.headers["content-range"] as string);
        const finalFilename = `${req.uploadId}-${req.file.originalname}`;

        logger.info(`Content range parsed: ${JSON.stringify(range)}`);

        // Handle chunked uploads
        if (range) {
            const uploadDir = path.join(__dirname, "../../uploads");
            const finalPath = path.join(uploadDir, finalFilename);

            // Check if this is the first chunk
            if (range.start === 0) {
                logger.info(`First chunk detected, creating new file: ${finalPath}`);

                // For first chunk, just rename the uploaded file to the final filename
                await fs.rename(req.file.path, finalPath);

                // Update the file reference
                req.file.path = finalPath;
            } else {
                logger.info(`Subsequent chunk detected, appending to: ${finalPath}`);

                try {
                    // Check if the target file exists
                    await fs.access(finalPath);

                    // Get existing file size to verify it matches range.start
                    const stats = await fs.stat(finalPath);

                    if (stats.size !== range.start) {
                        logger.error(
                            `Range mismatch: file size ${stats.size}, range start ${range.start}`
                        );

                        // If the file size is already the total size, the first chunk uploaded the entire file
                        if (stats.size === range.total) {
                            res.status(200).json({
                                message: "File already completely uploaded",
                                uploadId: req.uploadId,
                                filename: req.file.originalname,
                                path: finalFilename,
                                received: range.total,
                                total: range.total,
                                isComplete: true,
                            });
                            // start processing the file

                            enqueueAggregatingJob({
                                fileData: {
                                    filename: req.file.originalname,
                                    originalname: req.file.originalname,
                                    path: finalFilename,
                                    size: req.file.size,
                                    user: new Types.ObjectId(req.user.userId),
                                    status: "processing",
                                    resultName: `${req.uploadId}-aggregated_sales.csv`,
                                },
                                fileName: `${req.uploadId}-aggregated_sales.csv`
                                , filePath: req.file.path, outputFilePath: path.join(__dirname, "../../uploads/results", `${req.uploadId}-aggregated_sales.csv`)
                            });
                            // Clean up the temporary chunk file
                            await fs.unlink(req.file.path);
                            return;
                        }

                        res.status(416).json({
                            error: "Range mismatch",
                            expectedStart: stats.size,
                            currentFileSize: stats.size,
                            requestedStart: range.start,
                        });

                        // Clean up the temporary chunk file
                        await fs.unlink(req.file.path);
                        return;
                    }

                    // Append the chunk to the target file
                    const chunkData = await fs.readFile(req.file.path);
                    await fs.appendFile(finalPath, chunkData);

                    // Clean up the temporary chunk file
                    await fs.unlink(req.file.path);

                    // Update the file reference
                    req.file.path = finalPath;
                    req.file.size = stats.size + chunkData.length;

                    logger.info(
                        `Chunk appended successfully, new size: ${req.file.size}`
                    );
                } catch (error) {
                    logger.error(`Error processing chunk: ${error}`);

                    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                        // Target file doesn't exist, which means we're missing previous chunks
                        logger.error(`Target file not found: ${finalPath}`);
                        res.status(400).json({
                            error: "Previous chunks missing",
                            message:
                                "Cannot append chunk because the target file doesn't exist",
                        });

                        // Clean up the temporary chunk file
                        await fs.unlink(req.file.path);
                        return;
                    }

                    throw error;
                }
            }

            // Check if this is the last chunk
            const isLastChunk = range.end === range.total - 1;

            // Update Redis with the current status
            const metadata: UploadMetadata = {
                progress: Math.round(((range.end + 1) / range.total) * 100),
                loaded: range.end + 1,
                total: range.total,
                filename: req.file.originalname,
                status: isLastChunk ? "completed" : "uploading",
                timestamp: Date.now(),
            };

            await redis.setex(
                `upload:${req.uploadId}`,
                3600 * 24,
                JSON.stringify(metadata)
            );

            // Send response
            res.status(isLastChunk ? 200 : 202).json({
                message: isLastChunk ? "File upload completed" : "Chunk accepted",
                uploadId: req.uploadId,
                filename: req.file.originalname,
                path: finalFilename,
                received: range.end + 1,
                total: range.total,
                nextExpectedStart: range.end + 1,
                isComplete: isLastChunk,
            });
            if (isLastChunk) {
                const file = new FileModel();
                await file.save();
                // start processing the file 
                enqueueAggregatingJob({
                    fileData: {
                        filename: req.file.originalname,
                        originalname: req.file.originalname,
                        path: finalFilename,
                        size: req.file.size,
                        user: new Types.ObjectId(req.user.userId),
                        status: "processing",
                        resultName: `${req.uploadId}-aggregated_sales.csv`,
                    },
                    fileName: `${req.uploadId}-aggregated_sales.csv`

                    , filePath: req.file.path, outputFilePath: path.join(__dirname, "../../uploads/results", `${req.uploadId}-aggregated_sales.csv`)
                });
            }

        } else {
            // For non-chunked uploads, just update Redis and send response
            const metadata: UploadMetadata = {
                progress: 100,
                loaded: req.file.size,
                total: req.file.size,
                filename: req.file.originalname,
                status: "completed",
                timestamp: Date.now(),
            };

            await redis.setex(
                `upload:${req.uploadId}`,
                3600 * 24,
                JSON.stringify(metadata)
            );

            res.status(200).json({
                message: "File uploaded successfully",
                uploadId: req.uploadId,
                filename: req.file.originalname,
                path: finalFilename,
                received: req.file.size,
                total: req.file.size,
                isComplete: true,
            });
            // start processing the file 
            enqueueAggregatingJob({
                fileData: {
                    filename: req.file.originalname,
                    originalname: req.file.originalname,
                    path: finalFilename,
                    size: req.file.size,
                    user: new Types.ObjectId(req.user.userId),
                    status: "processing",
                    resultName: `${req.uploadId}-aggregated_sales.csv`,
                },
                fileName: `${req.uploadId}-aggregated_sales.csv`

                , filePath: req.file.path, outputFilePath: path.join(__dirname, "../../uploads/results", `${req.uploadId}-aggregated_sales.csv`)
            });
        }
    } catch (err) {
        logger.error(`Error in handleUpload: ${err}`);

        if (!res.headersSent) {
            res.status(500).json({
                error: "Upload failed",
                message: (err as Error).message,
            });
        } else {
            next(err);
        }
    }
};
export const handleDownload = async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) => {
    const { resultName } = req.params;
    console.log(resultName);
    const file = await FileModel.findOne({ resultName: resultName, user: req.user.userId });
    if (!file) {
        return res.status(404).json({ error: "File not found" });
    }
    const downloadPath = path.join(__dirname, "../../uploads/results", file.resultName);
    res.download(downloadPath);
};
export const getAllFiles = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {

    const files = await FileModel.find({ user: req.user.userId });
    res.status(200).json(files);
};
