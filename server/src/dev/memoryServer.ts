import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create({
  instance: {
    dbName: process.env.MONGODB_DB_NAME ?? 'capture_extension'
  }
});

process.env.MONGODB_URI = mongo.getUri();
process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'local-development-secret';

const stop = async () => {
  await mongo.stop();
};

process.once('SIGINT', () => {
  void stop().finally(() => process.exit(0));
});

process.once('SIGTERM', () => {
  void stop().finally(() => process.exit(0));
});

await import('../index.js');
