import { redis } from '../config/redis';
import { Queue } from 'bullmq';
export const aggregateQueue = new Queue('aggregate-sales', {
    connection: redis
});
export const enqueueAggregatingJob = async (data: {
    fileData: any,
    filePath: string,
    outputFilePath: string,
    fileName: string
}) => {
    await aggregateQueue.add('aggregate-sales', data, {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2
        },
    });
};
