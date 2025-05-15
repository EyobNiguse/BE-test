import Redis from "ioredis";
import dotenv from "dotenv";
dotenv.config();
export const redis = new Redis({
    host: "redis",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    maxRetriesPerRequest: null,



});
