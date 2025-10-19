import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server Configuration
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database Configuration
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'youtube_automation',
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: process.env.DB_SSL === 'true',
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },

  // YouTube API Configuration
  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID || '',
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
    redirectUri: process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3000/auth/youtube/callback',
    scopes: [
      'https://www.googleapis.com/auth/youtube.upload',
      'https://www.googleapis.com/auth/youtube',
      'https://www.googleapis.com/auth/youtube.readonly'
    ],
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000', 10),
  },

  // ElevenLabs Configuration
  elevenlabs: {
    apiKey: process.env.ELEVENLABS_API_KEY || '',
    voiceId: process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB',
    model: process.env.ELEVENLABS_MODEL || 'eleven_monolingual_v1',
  },

  // Unsplash Configuration
  unsplash: {
    accessKey: process.env.UNSPLASH_ACCESS_KEY || '',
    secretKey: process.env.UNSPLASH_SECRET_KEY || '',
  },

  // File Storage Configuration
  storage: {
    provider: process.env.STORAGE_PROVIDER || 'local', // 'local' | 'aws' | 'gcp'
    basePath: process.env.STORAGE_BASE_PATH || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '100000000', 10), // 100MB
  },

  // AWS Configuration (if using AWS storage)
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET || '',
  },

  // Video Processing Configuration
  video: {
    outputFormat: process.env.VIDEO_OUTPUT_FORMAT || 'mp4',
    outputResolution: process.env.VIDEO_OUTPUT_RESOLUTION || '1920x1080',
    outputFrameRate: parseInt(process.env.VIDEO_OUTPUT_FRAMERATE || '30', 10),
    outputBitrate: process.env.VIDEO_OUTPUT_BITRATE || '2000k',
    tempDir: process.env.VIDEO_TEMP_DIR || './temp',
  },

  // Thumbnail Configuration
  thumbnail: {
    width: parseInt(process.env.THUMBNAIL_WIDTH || '1280', 10),
    height: parseInt(process.env.THUMBNAIL_HEIGHT || '720', 10),
    quality: parseInt(process.env.THUMBNAIL_QUALITY || '90', 10),
    format: process.env.THUMBNAIL_FORMAT || 'jpeg',
  },

  // Queue Configuration
  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '3', 10),
    maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3', 10),
    retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '5000', 10),
  },

  // Rate Limiting Configuration
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },
};

// Validation function to ensure required environment variables are set
export function validateConfig(): void {
  const requiredVars = [
    'JWT_SECRET',
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.log(`⚠️  Missing environment variables: ${missingVars.join(', ')} - using defaults`);
  }
}

export default config;