import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
import FileModel from '../models/File';
import winston from 'winston';
import { Worker } from 'bullmq';
import { redis } from '../config/redis';
import { io } from '../server';
import { updateAggregates } from '../utils/aggregateSales';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [new winston.transports.Console()],
});

export const aggregateSalesJobHandler = async (jobData: {
    fileData: any,
    filePath: string,
    outputFilePath: string,
    fileName: string
}) => {
    const { fileData, filePath, outputFilePath, fileName } = jobData;

    const newFile = new FileModel(fileData);
    await newFile.save();

    const results: { [key: string]: number } = {};
    const dir = path.dirname(outputFilePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv({ headers: false }))
            .on('data', (row) => {
                updateAggregates(results, row);
            })
            .on('end', async () => {
                const csvWriter = createObjectCsvWriter({
                    path: outputFilePath,
                    header: [
                        { id: 'department', title: 'Department Name' },
                        { id: 'totalSales', title: 'Total Number of Sales' },
                    ],
                });

                const records = Object.entries(results).map(([department, totalSales]) => ({
                    department,
                    totalSales,
                }));

                await csvWriter.writeRecords(records);

                newFile.status = 'completed';
                newFile.resultName = fileName;
                await newFile.save();

                logger.info(`Processed file saved to: ${outputFilePath}`);
                resolve({ status: 'done', path: outputFilePath });
            })
            .on('error', (error) => {
                logger.error('Error processing CSV:', error);
                reject(error);
            });
    });
};
const worker = new Worker('aggregate-sales', async job => {
    return await aggregateSalesJobHandler(job.data);
}, { connection: redis });

worker.on('completed', async (job) => {

    console.log(`✅ Job ${job.id} ${job.data.fileData.originalname} completed`);
    const filePath = job.data.filePath;
    const fileName = path.basename(filePath);

    console.log(job.data.fileName);
    const socket = await redis.get(`socket:${job.data.fileData.user}`);
    if (socket) {
        io.to(socket).emit('process-completed', { fileName: fileName, resultName: job.data.fileName });
    }
})

// Start the worker with job data
