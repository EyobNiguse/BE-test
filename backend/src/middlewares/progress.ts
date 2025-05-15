import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { parseRange } from "../utils/range";
import { getExistingFileSize } from "../utils/file";
import { MulterRequest, UploadMetadata } from "../types";
import { redis } from "../config/redis";




export const progressMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log(`[${new Date().toISOString()}] Progress middleware started`);

        // Cast the standard Request to MulterRequest
        const multerReq = req as MulterRequest;

        // Get or generate upload ID
        const uploadId = (multerReq.headers["x-upload-id"] as string) || uuidv4();
        multerReq.uploadId = uploadId;
        console.log(`Upload ID: ${uploadId}`);

        // Parse content length and range
        let loaded = 0;
        const total = parseInt(req.headers["content-length"] || "0");
        console.log(`Content length: ${total} bytes`);

        const range = parseRange(req.headers["content-range"] as string);
        console.log(`Content range: ${JSON.stringify(range)}`);

        // If this is a chunked upload, verify the range
        if (range) {
            console.log(
                `Chunked upload detected: ${range.start}-${range.end}/${range.total}`
            );

            // Only verify range for non-first chunks
            if (range.start > 0) {
                // Get the size of any existing file for this upload
                const existingSize = await getExistingFileSize(uploadId, multerReq);
                console.log(
                    `Existing size for upload ${uploadId}: ${existingSize} bytes`
                );

                // Verify that the range start matches the existing file size
                if (range.start !== existingSize) {
                    console.log(
                        `Range mismatch: expected ${existingSize}, got ${range.start}`
                    );
                    res.status(416).json({
                        error: "Range mismatch",
                        expectedStart: existingSize,
                    });
                    return; // Don't proceed further
                }
            }
        }

        // Get existing metadata from Redis
        const getExistingMetadata = async (): Promise<UploadMetadata | null> => {
            const data = await redis.get(`upload:${uploadId}`);
            if (data) {
                try {
                    return JSON.parse(data) as UploadMetadata;
                } catch (e) {
                    console.error(`Error parsing Redis data: ${e}`);
                    return null;
                }
            }
            return null;
        };

        // Update progress in Redis
        const updateProgress = async () => {
            try {
                const existingMetadata = await getExistingMetadata();
                const existingSize = range ? range.start : 0;

                // Calculate progress based on the chunk and total file size
                const progress = range
                    ? Math.round(((loaded + existingSize) / range.total) * 100)
                    : Math.round((loaded / total) * 100);

                const metadata: UploadMetadata = {
                    progress,
                    loaded: loaded + existingSize,
                    total: range?.total || total,
                    filename: multerReq.file?.originalname || existingMetadata?.filename,
                    status: "uploading",
                    timestamp: Date.now(),
                };

                await redis.setex(
                    `upload:${uploadId}`,
                    3600 * 24,
                    JSON.stringify(metadata)
                );

                console.log(
                    `Progress updated: ${progress}%, loaded: ${loaded + existingSize
                    }, total: ${range?.total || total}`
                );
            } catch (e) {
                console.error(`Error updating progress: ${e}`);
            }
        };

        // Track upload progress
        req.on("data", (chunk: Buffer) => {
            loaded += chunk.length;
            updateProgress().catch((err) => {
                console.error(`Error in updateProgress: ${err}`);
            });
        });

        // Update final status when request is complete
        req.on("end", async () => {
            try {
                console.log(`Request body fully received for upload ${uploadId}`);

                // Only update the final status if this is not a chunk or it's the last chunk
                const isLastChunk = range ? range.end === range.total - 1 : true;

                if (isLastChunk) {
                    const metadata: UploadMetadata = {
                        progress: 100,
                        loaded: range ? range.total : total,
                        total: range ? range.total : total,
                        filename:
                            multerReq.file?.originalname ||
                            (await getExistingMetadata())?.filename,
                        status: "completed",
                        timestamp: Date.now(),
                    };

                    await redis.setex(
                        `upload:${uploadId}`,
                        3600 * 24,
                        JSON.stringify(metadata)
                    );

                    console.log(`Upload completed for ${uploadId}`);
                } else if (range) {
                    const existingMetadata = await getExistingMetadata();
                    const metadata: UploadMetadata = {
                        progress: Math.round(((range.end + 1) / range.total) * 100),
                        loaded: range.end + 1,
                        total: range.total,
                        filename:
                            multerReq.file?.originalname || existingMetadata?.filename,
                        status: "uploading",
                        timestamp: Date.now(),
                    };

                    await redis.setex(
                        `upload:${uploadId}`,
                        3600 * 24,
                        JSON.stringify(metadata)
                    );

                    console.log(
                        `Chunk received for ${uploadId}, waiting for more chunks`
                    );
                }
            } catch (e) {
                console.error(`Error in request end handler: ${e}`);
            }
        });
        // Continue to the next middleware
        next();
    } catch (error) {
        console.error(`Unexpected error in progressMiddleware: ${error}`);
        if (!res.headersSent) {
            res
                .status(500)
                .json({ error: "Upload failed", details: (error as Error).message });
        } else {
            next(error);
        }
    }
};
