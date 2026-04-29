import dotenv from 'dotenv';

dotenv.config();

const mongoUri = process.env.MONGODB_URI;
const mongoUser = process.env.MONGODB_USER;
const mongoPassword = process.env.MONGODB_PASSWORD;
const mongoCluster = process.env.MONGODB_CLUSTER;
const mongoDbName = process.env.MONGODB_DB_NAME ?? 'capture_extension';

const atlasUri =
  mongoUser && mongoPassword && mongoCluster
    ? `mongodb+srv://${encodeURIComponent(mongoUser)}:${encodeURIComponent(mongoPassword)}@${mongoCluster}/${mongoDbName}?retryWrites=true&w=majority&appName=CapturePlatform`
    : '';

const jwtSecret = process.env.JWT_SECRET ?? '';

export const env = {
  port: Number(process.env.PORT ?? 3000),
  mongoUri: mongoUri || atlasUri,
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d'
};

if (!env.mongoUri) {
  throw new Error('MONGODB_URI is required, or provide MONGODB_USER, MONGODB_PASSWORD, and MONGODB_CLUSTER.');
}

if (!env.jwtSecret) {
  throw new Error('JWT_SECRET is required.');
}
