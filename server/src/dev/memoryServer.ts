import { MongoMemoryServer } from 'mongodb-memory-server';

const mongoBinaryVersion = process.env.MONGOMS_VERSION ?? '7.0.14';

const mongo = await MongoMemoryServer.create({
  binary: {
    version: mongoBinaryVersion
  },
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
