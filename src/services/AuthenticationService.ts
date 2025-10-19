import { google } from 'googleapis';
import jwt from 'jsonwebtoken';
import { AuthenticationService } from '../types/services';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  AuthenticationError, 
  ExternalServiceError, 
  ValidationError,
  errorHandler 
} from '../utils/errors';
import { userModel } from '../models/User';

export class YouTubeAuthenticationService implements AuthenticationService {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.youtube.clientId,
      config.youtube.clientSecret,
      config.youtube.redirectUri
    );
  }

  /**
   * Generate YouTube OAuth authorization URL
   */
  generateAuthUrl(state?: string): string {
    try {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: config.youtube.scopes,
        state: state || '',
        prompt: 'consent', // Force consent screen to get refresh token
      });

      logger.info('Generated YouTube auth URL', { state });
      return authUrl;
    } catch (error) {
      logger.error('Failed to generate auth URL', error as Error);
      throw new ExternalServiceError('YouTube', 'Failed to generate authorization URL');
    }
  }

  /**
   * Exchange authorization code for access and refresh tokens
   */
  async authenticateWithYouTube(code: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      if (!code) {
        throw new ValidationError('Authorization code is required');
      }

      const { tokens } = await this.oauth2Client.getToken(code);
      
      if (!tokens.access_token) {
        throw new ExternalServiceError('YouTube', 'No access token received');
      }

      if (!tokens.refresh_token) {
        throw new ExternalServiceError('YouTube', 'No refresh token received');
      }

      logger.info('Successfully authenticated with YouTube');
      
      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };
    } catch (error) {
      logger.error('YouTube authentication failed', error as Error, { code: code?.substring(0, 10) + '...' });
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new ExternalServiceError('YouTube', `Authentication failed: ${(error as Error).message}`);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<string> {
    try {
      if (!refreshToken) {
        throw new ValidationError('Refresh token is required');
      }

      this.oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      const { credentials } = await this.oauth2Client.refreshAccessToken();
      
      if (!credentials.access_token) {
        throw new ExternalServiceError('YouTube', 'Failed to refresh access token');
      }

      logger.info('Successfully refreshed access token');
      
      return credentials.access_token;
    } catch (error) {
      logger.error('Failed to refresh access token', error as Error);
      throw new ExternalServiceError('YouTube', `Token refresh failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validate access token by making a test API call
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      if (!accessToken) {
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
      
      // Test the token by getting channel info
      await youtube.channels.list({
        part: ['id'],
        mine: true,
      });

      return true;
    } catch (error) {
      logger.warn('Token validation failed', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Get YouTube channel information
   */
  async getChannelInfo(accessToken: string): Promise<any> {
    try {
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      const youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
      
      const response = await youtube.channels.list({
        part: ['id', 'snippet', 'statistics'],
        mine: true,
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new ExternalServiceError('YouTube', 'No channel found for this account');
      }

      const channel = response.data.items[0];
      
      return {
        id: channel.id,
        title: channel.snippet?.title,
        description: channel.snippet?.description,
        customUrl: channel.snippet?.customUrl,
        thumbnails: channel.snippet?.thumbnails,
        subscriberCount: channel.statistics?.subscriberCount,
        videoCount: channel.statistics?.videoCount,
        viewCount: channel.statistics?.viewCount,
      };
    } catch (error) {
      logger.error('Failed to get channel info', error as Error);
      throw new ExternalServiceError('YouTube', `Failed to get channel info: ${(error as Error).message}`);
    }
  }

  /**
   * Revoke access for a user
   */
  async revokeAccess(userId: string): Promise<void> {
    try {
      const user = await userModel.findById(userId);
      if (!user || !user.accessToken) {
        throw new ValidationError('User not found or no access token');
      }

      // Revoke the token with Google
      if (user.refreshToken) {
        try {
          await this.oauth2Client.revokeToken(user.refreshToken);
        } catch (error) {
          logger.warn('Failed to revoke token with Google', { error: (error as Error).message });
        }
      }

      // Clear tokens from database
      await userModel.update(userId, {
        accessToken: undefined,
        refreshToken: undefined,
        youtubeChannelId: undefined,
      });

      logger.info('Successfully revoked access', { userId });
    } catch (error) {
      logger.error('Failed to revoke access', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Generate JWT token for user session
   */
  generateJWTToken(userId: string, email: string): string {
    try {
      const payload = {
        userId,
        email,
        iat: Math.floor(Date.now() / 1000),
      };

      return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as any);
    } catch (error) {
      logger.error('Failed to generate JWT token', error as Error, { userId });
      throw new AuthenticationError('Failed to generate session token');
    }
  }

  /**
   * Verify JWT token
   */
  verifyJWTToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      logger.warn('JWT token verification failed', { error: (error as Error).message });
      throw new AuthenticationError('Invalid or expired token');
    }
  }

  /**
   * Refresh user tokens if needed
   */
  async ensureValidToken(userId: string): Promise<string> {
    try {
      const user = await userModel.findById(userId);
      if (!user) {
        throw new AuthenticationError('User not found');
      }

      if (!user.accessToken) {
        throw new AuthenticationError('No access token found');
      }

      // Check if token is still valid
      const isValid = await this.validateToken(user.accessToken);
      if (isValid) {
        return user.accessToken;
      }

      // Try to refresh the token
      if (!user.refreshToken) {
        throw new AuthenticationError('No refresh token available');
      }

      const newAccessToken = await this.refreshAccessToken(user.refreshToken);
      
      // Update user with new token
      await userModel.updateTokens(userId, newAccessToken);
      
      return newAccessToken;
    } catch (error) {
      logger.error('Failed to ensure valid token', error as Error, { userId });
      throw error;
    }
  }

  /**
   * Complete OAuth flow and create/update user
   */
  async completeOAuthFlow(code: string, email: string): Promise<{ user: any; jwtToken: string }> {
    try {
      // Exchange code for tokens
      const { accessToken, refreshToken } = await this.authenticateWithYouTube(code);
      
      // Get channel info
      const channelInfo = await this.getChannelInfo(accessToken);
      
      // Find or create user
      let user = await userModel.findByEmail(email);
      
      if (user) {
        // Update existing user
        user = await userModel.update(user.id, {
          accessToken,
          refreshToken,
          youtubeChannelId: channelInfo.id,
        });
      } else {
        // Create new user
        user = await userModel.create({
          email,
          accessToken,
          refreshToken,
          youtubeChannelId: channelInfo.id,
          preferences: {
            defaultVoice: 'pNInz6obpgDQGcFmaJgB',
            defaultCategory: '27',
            defaultPrivacy: 'private',
            videoStyle: 'educational',
            thumbnailStyle: 'professional',
          },
        });
      }

      // Generate JWT token
      const jwtToken = this.generateJWTToken(user.id, user.email);
      
      logger.info('OAuth flow completed successfully', { 
        userId: user.id, 
        email: user.email,
        channelId: channelInfo.id 
      });
      
      return { user, jwtToken };
    } catch (error) {
      logger.error('OAuth flow failed', error as Error, { email });
      throw error;
    }
  }
}

export const authService = new YouTubeAuthenticationService();