import { SystemError, ErrorContext } from '../types';
import { logger } from './logger';

export class AppError extends Error {
  public readonly code: string;
  public readonly category: 'user' | 'external' | 'system';
  public readonly retryable: boolean;
  public readonly statusCode: number;
  public readonly context?: any;

  constructor(
    message: string,
    code: string,
    category: 'user' | 'external' | 'system',
    retryable: boolean = false,
    statusCode: number = 500,
    context?: any
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    this.statusCode = statusCode;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }

  toSystemError(): SystemError {
    return {
      code: this.code,
      message: this.message,
      category: this.category,
      retryable: this.retryable,
      context: this.context,
    };
  }
}

// Specific Error Classes
export class ValidationError extends AppError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', 'user', false, 400, context);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', context?: any) {
    super(message, 'AUTH_ERROR', 'user', false, 401, context);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', context?: any) {
    super(message, 'AUTHORIZATION_ERROR', 'user', false, 403, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: any) {
    super(`${resource} not found`, 'NOT_FOUND', 'user', false, 404, context);
  }
}

export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, retryable: boolean = true, context?: any) {
    super(`${service} error: ${message}`, 'EXTERNAL_SERVICE_ERROR', 'external', retryable, 502, context);
  }
}

export class VideoProcessingError extends AppError {
  constructor(message: string, retryable: boolean = true, context?: any) {
    super(`Video processing error: ${message}`, 'VIDEO_PROCESSING_ERROR', 'system', retryable, 500, context);
  }
}

export class FileStorageError extends AppError {
  constructor(message: string, retryable: boolean = true, context?: any) {
    super(`File storage error: ${message}`, 'FILE_STORAGE_ERROR', 'system', retryable, 500, context);
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, retryable: boolean = true, context?: any) {
    super(`Database error: ${message}`, 'DATABASE_ERROR', 'system', retryable, 500, context);
  }
}

export class QueueError extends AppError {
  constructor(message: string, retryable: boolean = true, context?: any) {
    super(`Queue error: ${message}`, 'QUEUE_ERROR', 'system', retryable, 500, context);
  }
}

// Error Handler Class
export class ErrorHandler {
  async handleError(error: SystemError, context?: ErrorContext): Promise<void> {
    this.logError(error, context);

    // Additional error handling logic can be added here
    // e.g., sending notifications, updating metrics, etc.
  }

  async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (error instanceof AppError && !error.retryable) {
          throw error;
        }

        if (attempt === maxRetries) {
          break;
        }

        logger.warn(`Operation failed, retrying (${attempt}/${maxRetries})`, {
          error: error instanceof Error ? error.message : String(error),
          attempt,
          maxRetries,
        });

        await this.sleep(delay * Math.pow(2, attempt - 1)); // Exponential backoff
      }
    }

    throw lastError!;
  }

  logError(error: SystemError | Error, context?: ErrorContext): void {
    const errorContext = {
      ...context,
      timestamp: new Date(),
    };

    if (error instanceof AppError) {
      logger.error(error.message, error, {
        code: error.code,
        category: error.category,
        retryable: error.retryable,
        context: errorContext,
      });
    } else {
      logger.error(error.message, error, errorContext);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const errorHandler = new ErrorHandler();

// Utility functions for common error scenarios
export function createValidationError(field: string, value: any, rule: string): ValidationError {
  return new ValidationError(`Validation failed for field '${field}': ${rule}`, {
    field,
    value,
    rule,
  });
}

export function createExternalServiceError(
  service: string,
  operation: string,
  originalError: Error,
  retryable: boolean = true
): ExternalServiceError {
  return new ExternalServiceError(service, `${operation} failed: ${originalError.message}`, retryable, {
    operation,
    originalError: originalError.message,
  });
}

export function createNotFoundError(resource: string, id: string): NotFoundError {
  return new NotFoundError(resource, { id });
}