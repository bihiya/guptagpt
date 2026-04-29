import { spawn } from 'node:child_process';
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create({
  instance: {
    dbName: 'capture_extension'
  }
});

const defaultCorsOrigin = `http://${'localhost'}:5173`;

const child = spawn('tsx', ['watch', 'src/index.ts'], {
  env: {
    ...process.env,
    MONGODB_URI: mongo.getUri(),
    JWT_SECRET: process.env.JWT_SECRET ?? 'local-development-secret',
    CORS_ORIGIN: process.env.CORS_ORIGIN ?? defaultCorsOrigin
  },
  stdio: 'inherit'
});

const shutdown = async () => {
  child.kill('SIGTERM');
  await mongo.stop();
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    shutdown()
      .then(() => process.exit(0))
      .catch((error: unknown) => {
        console.error('Failed to stop in-memory MongoDB', error);
        process.exit(1);
      });
  });
}

child.on('exit', async (code) => {
  await mongo.stop();
  process.exit(code ?? 0);
});
