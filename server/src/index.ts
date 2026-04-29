import cors from 'cors';
import express from 'express';
import { connectDb } from './config/db.js';
import { env } from './config/env.js';
import captureRoutes from './routes/captureRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

const allowedOrigins = new Set(
  env.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || origin.startsWith('chrome-extension://')) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    }
  })
);
app.use(express.json({ limit: '25mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

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
