const dotenv = require('dotenv');
const path = require('path');

// Load .env from root or backend directory
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function validateEnv() {
  const NODE_ENV = process.env.NODE_ENV || 'development';
  const PORT = parseInt(process.env.PORT, 10) || 5000;

  // DB config
  const DB_HOST = process.env.DB_HOST || '127.0.0.1';
  const DB_PORT = parseInt(process.env.DB_PORT, 10) || 5432;
  const DB_USER = process.env.DB_USER || 'postgres';
  const DB_PASSWORD = process.env.DB_PASSWORD || '';
  const DB_NAME = process.env.DB_NAME || 'stocksense_db';

  const defaultDbUrl = `postgresql://${DB_USER}${DB_PASSWORD ? `:${DB_PASSWORD}` : ''}@${DB_HOST}:${DB_PORT}/${DB_NAME}`;
  const DATABASE_URL = process.env.DATABASE_URL || defaultDbUrl;

  // Security
  let JWT_SECRET = process.env.JWT_SECRET;
  if (!JWT_SECRET) {
    if (NODE_ENV === 'production') {
      throw new Error('[FATAL] JWT_SECRET is required in production environment');
    }
    JWT_SECRET = 'stocksense_dev_jwt_secret_2026';
    if (NODE_ENV !== 'test') {
      console.warn('[SECURITY WARNING] Running with default development JWT_SECRET. Set JWT_SECRET in production.');
    }
  }

  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
  const ALLOW_DEMO_OTP = process.env.ALLOW_DEMO_OTP === 'true';

  return {
    NODE_ENV,
    PORT,
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_NAME,
    DATABASE_URL,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    CORS_ORIGIN,
    ALLOW_DEMO_OTP,
  };
}

const env = validateEnv();

module.exports = env;
