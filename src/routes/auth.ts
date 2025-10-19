import { Router, Request, Response } from 'express';
import { authService } from '../services/AuthenticationService';
import { userModel } from '../models/User';
import { authenticateToken, authRateLimit } from '../middleware/auth';
import { ValidationError, AuthenticationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

// Rate limiting disabled for development
// router.use(authRateLimit(5, 15 * 60 * 1000)); // 5 attempts per 15 minutes

/**
 * GET /auth/youtube
 * Initiate YouTube OAuth flow
 */
router.get('/youtube', (req: Request, res: Response) => {
  try {
    const { email, state } = req.query;
    
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email parameter is required');
    }

    // Generate auth URL with state containing email
    const stateData = JSON.stringify({ email, timestamp: Date.now() });
    const authUrl = authService.generateAuthUrl(Buffer.from(stateData).toString('base64'));
    
    logger.info('YouTube OAuth flow initiated', { email });
    
    res.json({
      success: true,
      data: {
        authUrl,
        message: 'Redirect user to this URL to complete YouTube authentication',
      },
    });
  } catch (error) {
    logger.error('Failed to initiate YouTube OAuth', error as Error);
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to initiate authentication',
      });
    }
  }
});

/**
 * GET /auth/youtube/callback
 * Handle YouTube OAuth callback
 */
router.get('/youtube/callback', async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;
    
    if (error) {
      logger.warn('YouTube OAuth error', { error });
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3001'}/auth/error?error=${error}`);
    }
    
    if (!code || typeof code !== 'string') {
      throw new ValidationError('Authorization code is required');
    }
    
    if (!state || typeof state !== 'string') {
      throw new ValidationError('State parameter is required');
    }

    // Decode state to get email
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      throw new ValidationError('Invalid state parameter');
    }
    
    const { email } = stateData;
    if (!email) {
      throw new ValidationError('Email not found in state');
    }

    // Complete OAuth flow
    const { user, jwtToken } = await authService.completeOAuthFlow(code, email);
    
    logger.info('YouTube OAuth completed successfully', { 
      userId: user.id, 
      email: user.email 
    });
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    res.redirect(`${frontendUrl}/auth/success?token=${jwtToken}`);
    
  } catch (error) {
    logger.error('YouTube OAuth callback failed', error as Error);
    
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
    res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(errorMessage)}`);
  }
});

/**
 * POST /auth/refresh
 * Refresh access token
 */
router.post('/refresh', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    const newAccessToken = await authService.ensureValidToken(req.user.userId);
    
    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        message: 'Token refreshed successfully',
      },
    });
  } catch (error) {
    logger.error('Token refresh failed', error as Error, { userId: req.user?.userId });
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: 'Authentication error',
        message: error.message,
        requiresAuth: true,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to refresh token',
      });
    }
  }
});

/**
 * GET /auth/me
 * Get current user information
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    const user = await userModel.findById(req.user.userId);
    if (!user) {
      throw new AuthenticationError('User not found');
    }

    // Don't return sensitive information
    const userInfo = {
      id: user.id,
      email: user.email,
      youtubeChannelId: user.youtubeChannelId,
      preferences: user.preferences,
      createdAt: user.createdAt,
      hasYouTubeAccess: !!(user.accessToken && user.refreshToken),
    };

    res.json({
      success: true,
      data: userInfo,
    });
  } catch (error) {
    logger.error('Failed to get user info', error as Error, { userId: req.user?.userId });
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: 'Authentication error',
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get user information',
      });
    }
  }
});

/**
 * GET /auth/youtube/channel
 * Get YouTube channel information
 */
router.get('/youtube/channel', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    const accessToken = await authService.ensureValidToken(req.user.userId);
    const channelInfo = await authService.getChannelInfo(accessToken);
    
    res.json({
      success: true,
      data: channelInfo,
    });
  } catch (error) {
    logger.error('Failed to get channel info', error as Error, { userId: req.user?.userId });
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: 'Authentication error',
        message: error.message,
        requiresAuth: true,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to get channel information',
      });
    }
  }
});

/**
 * POST /auth/logout
 * Logout user and revoke access
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    await authService.revokeAccess(req.user.userId);
    
    logger.info('User logged out successfully', { userId: req.user.userId });
    
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error('Logout failed', error as Error, { userId: req.user?.userId });
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to logout',
    });
  }
});

/**
 * PUT /auth/preferences
 * Update user preferences
 */
router.put('/preferences', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      throw new AuthenticationError('User not authenticated');
    }

    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      throw new ValidationError('Valid preferences object is required');
    }

    const updatedUser = await userModel.update(req.user.userId, { preferences });
    
    res.json({
      success: true,
      data: {
        preferences: updatedUser.preferences,
        message: 'Preferences updated successfully',
      },
    });
  } catch (error) {
    logger.error('Failed to update preferences', error as Error, { userId: req.user?.userId });
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message,
      });
    } else if (error instanceof AuthenticationError) {
      res.status(401).json({
        success: false,
        error: 'Authentication error',
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to update preferences',
      });
    }
  }
});

export default router;