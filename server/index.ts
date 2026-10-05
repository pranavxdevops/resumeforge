import 'dotenv/config';
import { createApp } from './app';
import { migrate, closeDatabase } from './db';
import { cleanupExpiredData } from './maintenance';
console.log('Initializing ResumeForge database…');
await migrate();
if (!process.env.REDIS_URL) {
  await cleanupExpiredData();
  setInterval(
    () =>
      void cleanupExpiredData().catch(() =>
        console.error('Local maintenance failed; retrying on next interval.'),
      ),
    86400000,
  ).unref();
}
const port = Number(process.env.PORT || 4000);
const server = createApp().listen(port, () =>
  console.log(`ResumeForge API ready: http://127.0.0.1:${port}`),
);
for (const signal of ['SIGTERM', 'SIGINT'])
  process.on(signal, () => {
    server.close(() => {
      void closeDatabase().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10000).unref();
  });
