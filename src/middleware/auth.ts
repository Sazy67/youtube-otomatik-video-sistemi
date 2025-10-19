import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/AuthenticationService';
import { AuthenticationError, AuthorizationError } from '../utils/errors';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
      };
    }
  }
}

/**
 * Middleware to authenticate JWT tokens
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      throw new AuthenticationError('Access token required');
    }

    const decoded = authService.verifyJWTToken(token);
    req.user = decoded;
    
    logger.debug('Token authenticated successfully', { userId: decoded.userId });
    next();
  } catch (error) {
    logger.warn('Authentication failed', { error: (error as Error).message });
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: error.message,
      });
    } else {
      res.status(401).json({
        success: false,
        error: 'Authentication failed',
        message: 'Invalid or expired token',
      });
    }
  }
};

/**
 * Middleware to ensure user has valid YouTube access
 */
export const requireYouTubeAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    // Ensure user has valid YouTube token
    await authService.ensureValidToken(req.user.userId);
    
    logger.debug('YouTube access verified', { userId: req.user.userId });
    next();
  } catch (error) {
    logger.warn('YouTube access verification failed', { 
      error: (error as Error).message,
      userId: req.user?.userId 
    });
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: 'YouTube access required',
        message: error.message,
        requiresAuth: true,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to verify YouTube access',
      });
    }
  }
};

/**
 * Optional authentication middleware - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = authService.verifyJWTToken(token);
      req.user = decoded;
      logger.debug('Optional auth successful', { userId: decoded.userId });
    }
    
    next();
  } catch (error) {
    // Don't fail on optional auth, just log and continue
    logger.debug('Optional auth failed', { error: (error as Error).message });
    next();
  }
};

/**
 * Middleware to check if user owns a resource
 */
export const requireResourceOwnership = (resourceUserIdField: string = 'userId') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('User not authenticated');
      }

      const resourceUserId = req.params[resourceUserIdField] || req.body[resourceUserIdField];
      
      if (!resourceUserId) {
        throw new AuthorizationError('Resource user ID not found');
      }

      if (req.user.userId !== resourceUserId) {
        throw new AuthorizationError('Access denied - not resource owner');
      }

      next();
    } catch (error) {
      logger.warn('Resource ownership check failed', { 
        error: (error as Error).message,
        userId: req.user?.userId,
        resourceUserId: req.params[resourceUserIdField] || req.body[resourceUserIdField]
      });
      
      if (error instanceof AuthorizationError) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: error.message,
        });
      } else if (error instanceof AuthenticationError) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          message: 'Failed to verify resource ownership',
        });
      }
    }
  };
};

/**
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = (maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000) => {
  const attempts = new Map<string, { count: number; resetTime: number }>();

  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientAttempts = attempts.get(clientId);
    
    if (clientAttempts && now < clientAttempts.resetTime) {
      if (clientAttempts.count >= maxAttempts) {
        logger.warn('Rate limit exceeded for auth endpoint', { 
          clientId, 
          attempts: clientAttempts.count 
        });
        
        res.status(429).json({
          success: false,
          error: 'Too many attempts',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((clientAttempts.resetTime - now) / 1000),
        });
        return;
      }
    } else {
      // Reset or initialize attempts
      attempts.set(clientId, { count: 0, resetTime: now + windowMs });
    }

    // Increment attempt count on error
    const originalSend = res.send;
    res.send = function(body) {
      if (res.statusCode >= 400) {
        const clientAttempts = attempts.get(clientId);
        if (clientAttempts) {
          clientAttempts.count++;
        }
      }
      return originalSend.call(this, body);
    };

    next();
  };
};