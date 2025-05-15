import { Request } from "express";

export interface UploadMetadata {
    progress: number;
    loaded: number;
    total: number;
    filename?: string;
    status: "uploading" | "completed";
    timestamp: number;

}

export interface Range {
    start: number;
    end: number;
    total: number;
}

export interface MulterRequest extends Request {
    uploadId?: string | string[];
    file?: Express.Multer.File; // Use Express.Multer.File for single file uploads
    files?:
    | Express.Multer.File[]
    | { [fieldname: string]: Express.Multer.File[] }; // Support both array and object formats
    user: {
        userId: string;
       
    };
}
