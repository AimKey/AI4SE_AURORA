import dotenv from 'dotenv';
import type { Config } from './types';

// Load environment variables
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

// Environment validation
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'] as const;
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingEnvVars.join(', '));
  console.error('Please check your .env.dev or .env.production file');
  process.exit(1);
}

export const config = {
  // Server
  port: Number(process.env.PORT || 4000),
  clientOrigin: process.env.CLIENT_ORIGIN || '',

  // Database
  mongoUri: process.env.MONGO_URI!,
  redisHost: process.env.REDIS_HOST || '',
  redisPort: Number(process.env.REDIS_PORT || 0),
  redisPassword: process.env.REDIS_PASSWORD || '',

  //azure
  azureClientId: process.env.AZURE_CLIENT_ID || '',
  azureClientSecret: process.env.AZURE_CLIENT_SECRET || '',
  azureTenantId: process.env.AZURE_TENANT_ID || '',

  // Security
  jwtSecret: process.env.JWT_SECRET!,

  // Email Service
  smtpUser: process.env.SMTP_USER || '',
  sendgridApiKey: process.env.SENDGRID_API_KEY || '',

  // Third-party services
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  // googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  // sepayApiKey: process.env.SEPAY_API_KEY || '',
  // resendApiKey: process.env.RESEND_API_KEY || '',
  // twilioApiKey: process.env.TWILIO_API_KEY || '',
  // upstashRedisUrl: process.env.UPSTASH_REDIS_URL || '',

  //Payos
  payosClientId: process.env.PAYOS_CLIENT_ID || '',
  payosApiKey: process.env.PAYOS_API_KEY || '',
  payosChecksumKey: process.env.PAYOS_CHECKSUM_KEY || '',

  payosPOClientId: process.env.PAYOS_PAYOUT_CLIENT_ID || '',
  payosPOApiKey: process.env.PAYOS_PAYOUT_API_KEY || '',
  payosPOChecksumKey: process.env.PAYOS_PAYOUT_CHECKSUM_KEY || '',
  payosApiUrl: process.env.PAYOS_API_URL || '',

  //Cloudinary
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',

  // Environment
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production'
} satisfies Config;


