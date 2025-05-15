import mongoose, { Schema, Document, model } from "mongoose";

export interface IFile extends Document {
    _id: mongoose.Types.ObjectId;
    filename: string;
    originalname: string;
    path: string;
    size: number;
    uploadedAt: Date;
    user: mongoose.Types.ObjectId;
    status: "processing" | "completed";
    resultName: string;
}

const fileSchema: Schema<IFile> = new Schema({
    filename: { type: String, required: true },
    originalname: { type: String, required: true },
    path: { type: String, required: true },
    size: { type: Number, required: true },
    uploadedAt: { type: Date, default: Date.now },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["processing", "completed"], default: "processing" },
    resultName: { type: String, required: false },
});

const FileModel = model<IFile>("File", fileSchema);

export default FileModel;
