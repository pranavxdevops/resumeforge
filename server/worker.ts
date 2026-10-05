import 'dotenv/config';
import { Queue, Worker } from 'bullmq';
import { migrate, closeDatabase } from './db';
import { cleanupExpiredData } from './maintenance';
if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required for the background worker.');
await migrate();
const url = new URL(process.env.REDIS_URL);
const connection = {
  host: url.hostname,
  port: Number(url.port || 6379),
  password: url.password || undefined,
  tls: url.protocol === 'rediss:' ? {} : undefined,
};
const queue = new Queue('maintenance', { connection });
await queue.upsertJobScheduler(
  'daily-cleanup',
  { every: 86400000 },
  { name: 'cleanup', data: {}, opts: { removeOnComplete: 10, removeOnFail: 20 } },
);
const worker = new Worker('maintenance', cleanupExpiredData, { connection });
worker.on('failed', (_job, error) => console.error('Maintenance failed', error.message));
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    void Promise.all([worker.close(), queue.close()])
      .then(closeDatabase)
      .then(() => process.exit(0));
  });
