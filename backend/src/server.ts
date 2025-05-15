import dotenv from "dotenv";
import { Server, Socket } from 'socket.io';
import app from "./app";
import { connectDB } from "./config/db";
import jwt from "jsonwebtoken";
import http from "http";
import cookie from "cookie";
import { redis } from "./config/redis";
dotenv.config();

const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: '*', // Replace with frontend origin
        methods: ['GET', 'POST'],
    },
});

const PORT = process.env.PORT || 5000;
const startServer = async () => {
    await connectDB();


    io.on('connection', async (socket: Socket) => {
        const cookies = socket.handshake.headers.cookie;
        const parsedCookies = cookie.parse(cookies || '');
        const authToken = parsedCookies['token'];

        if (!authToken) {
            return socket.disconnect();
        }
        let userId: string;
        try {
            const payload = jwt.verify(authToken, process.env.JWT_SECRET!) as any;
            userId = payload.userId;
        } catch (err) {
            console.log('Invalid auth token.', err);
            return socket.disconnect();
        }

        await redis.set(`socket:${userId}`, socket.id);
        console.log(`User ${userId} connected via socket ${socket.id}`);

        socket.on('disconnect', async () => {
            await redis.del(`socket:${userId}`);
            console.log(`User ${userId} disconnected`);
        });

    });
    server.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
};
startServer();

