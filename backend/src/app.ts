
import express from "express";
import authRoutes from "./routes/authRoutes";
import fileRoutes from "./routes/fileRoutes";
import { swaggerUi, swaggerSpec } from "./docs/swagger";
import cors from "cors";
import cookieParser from "cookie-parser";
import winston from "winston";
import healthRoute from "./routes/healthRoute";
import "./workers/process.worker";

const logger = winston.createLogger({
    level: "info",
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});
const app = express();
app.use(cors({
    origin: process.env.FRONT_END_URL, // Replace with your real frontend domain
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
}));
app.use(cookieParser());
app.use(express.json());
app.use((req, res, next) => {

    if (req.originalUrl.startsWith("/upload") && req.method === "POST") {
        next(); // Skip body parsers for upload route
    } else {
        // Apply body parsers for other routes
        express.json()(req, res, (err) => {

            if (err) {
                logger.error(`JSON body parser error: ${err}`);
                res.status(400).json({ error: "Invalid JSON" });
                return;
            }
            express.urlencoded({ extended: true })(req, res, next);
        });
    }
});

// swagger documentation end point
app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        swaggerOptions: {
            withCredentials: true,
        },
    })
);
app.use("/auth", authRoutes);
app.use("/upload", fileRoutes);
app.use("/health", healthRoute);

export default app;




