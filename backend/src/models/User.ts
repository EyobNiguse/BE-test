import mongoose, { Schema, Document, model } from "mongoose";

interface IUser extends Document {
    email: string;
    password: string;
    files: mongoose.Types.ObjectId[];
}

const userSchema: Schema<IUser> = new Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    files: [{ type: mongoose.Schema.Types.ObjectId, ref: "File" }],
});


const User = model<IUser>("User", userSchema);

export default User;
