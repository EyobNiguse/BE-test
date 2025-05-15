import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MulterRequest } from "../types";

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the size of an existing file for a given upload ID
 */
export const getExistingFileSize = async (
    uploadId: string,
    req: MulterRequest
): Promise<number> => {
    try {
        const uploadDir = path.join(__dirname, "../../uploads");

        // First, try to find the exact file
        const exactFilename = `${uploadId}-${req.file?.originalname || ""}`;
        const exactPath = path.join(uploadDir, exactFilename);

        try {
            const stats = await fs.stat(exactPath);
            console.log(`Found exact file: ${exactFilename}, size: ${stats.size}`);
            return stats.size;
        } catch (error) {
            // File doesn't exist, continue to search
            console.log(
                `Exact file not found: ${exactFilename}, searching for alternatives`
            );
        }

        // Read all files in the upload directory
        const files = await fs.readdir(uploadDir);

        // Find a file that starts with the upload ID and is not a temporary chunk
        const existingFile = files.find(
            (f) => f.startsWith(uploadId) && !f.includes("-chunk-")
        );

        if (existingFile) {
            // If we found a file, get its size
            const stats = await fs.stat(path.join(uploadDir, existingFile));
            console.log(`Found existing file: ${existingFile}, size: ${stats.size}`);
            return stats.size;
        }

        // If no file exists yet, return 0
        console.log(`No existing file found for upload ID: ${uploadId}`);
        return 0;
    } catch (error) {
        console.error(`Error getting existing file size: ${error}`);
        return 0;
    }
};
