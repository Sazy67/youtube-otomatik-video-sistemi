import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config, validateConfig } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './utils/errors';
import { db } from './database/connection';

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import videoRoutes from './routes/videos';
import batchRoutes from './routes/batch';
import dashboardRoutes from './routes/dashboard';

export class App {
  public app: express.Application;

  constructor() {
    this.app = express();
    this.initializeMiddleware();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    // Security middleware with relaxed CSP for development
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
          scriptSrcAttr: ["'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    
    // CORS
    this.app.use(cors(config.cors));
    
    // Static files
    this.app.use(express.static('public'));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      logger.info('HTTP Request', {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
      });
      next();
    });
  }

  private initializeRoutes(): void {
    // Simple test page (no CSP issues)
    this.app.get('/simple', (req, res) => {
      res.sendFile('simple.html', { root: 'public' });
    });

    // Test page route
    this.app.get('/test', (req, res) => {
      res.sendFile('test.html', { root: 'public' });
    });

    // Dashboard route
    this.app.get('/dashboard', (req, res) => {
      res.sendFile('index.html', { root: 'public' });
    });

    // Home page - redirect to simple page
    this.app.get('/', (req, res) => {
      res.redirect('/simple');
    });

    // Health check
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    });

    // API routes
    this.app.use('/auth', authRoutes);
    this.app.use('/api/projects', projectRoutes);
    this.app.use('/api/videos', videoRoutes);
    this.app.use('/api/batch', batchRoutes);
    this.app.use('/api/dashboard', dashboardRoutes);

    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found',
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error('Unhandled error in Express app', error);
      
      res.status(error.statusCode || 500).json({
        success: false,
        error: error.name || 'Internal Server Error',
        message: error.message || 'An unexpected error occurred',
      });
    });
  }

  public async start(): Promise<void> {
    try {
      // Validate configuration
      validateConfig();
      
      // Skip database connection for now
      logger.info('⚠️  Running without database - using mock data');
      
      // Start server
      const port = config.port;
      this.app.listen(port, () => {
        logger.info(`🚀 YouTube Automation System started on port ${port}`, {
          port,
          nodeEnv: config.nodeEnv,
        });
        console.log(`\n🌐 Server running at: http://localhost:${port}`);
        console.log(`📊 Health check: http://localhost:${port}/health`);
        console.log(`🔐 Auth endpoint: http://localhost:${port}/auth/youtube`);
        console.log(`📹 API endpoints: http://localhost:${port}/api/*\n`);
      });
    } catch (error) {
      logger.error('Failed to start application', error as Error);
      process.exit(1);
    }
  }

  public async stop(): Promise<void> {
    try {
      await db.disconnect();
      logger.info('Application stopped gracefully');
    } catch (error) {
      logger.error('Error during application shutdown', error as Error);
    }
  }
}

export default App;