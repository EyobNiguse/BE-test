import mongoose from 'mongoose';
const MONGO_URI = process.env.MONGODB_URL || "";
console.log(MONGO_URI   )
export const connectDB = async (): Promise<void> => {
    try {
        await mongoose.connect(MONGO_URI, {
        });
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection failed:', error);
        process.exit(1);
    }
};



// Execute main logic

