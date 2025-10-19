import App from './app';
import { logger } from './utils/logger';

const app = new App();

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await app.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await app.stop();
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', new Error(String(reason)), { promise });
  process.exit(1);
});

// Start the application
app.start().catch((error) => {
  logger.error('Failed to start application', error);
  process.exit(1);
});