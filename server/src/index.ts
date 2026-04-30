import cors from 'cors';
import express from 'express';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import captureRoutes from './routes/captureRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      const isChromeExtensionOrigin = Boolean(origin?.startsWith('chrome-extension://'));

      if (!origin || env.corsOrigins.includes(origin) || isChromeExtensionOrigin) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    }
  })
);
app.use(express.json({ limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

app.use('/api/auth', authRoutes);
app.use('/api', captureRoutes);
app.use(errorHandler);

connectDb()
  .then(() => {
    app.listen(env.port, () => {
      console.log(`API listening on :${env.port}`);
    });
  })
  .catch((error: unknown) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
