import { google } from 'googleapis';
import fs from 'fs/promises';
import { YouTubeUploadService } from '../types/services';
import { VideoFile, VideoMetadata, YouTubeUploadResult, YouTubeVideoStats } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  ExternalServiceError, 
  ValidationError,
  AuthenticationError 
} from '../utils/errors';
import { authService } from './AuthenticationService';

export class YouTubeUploadServiceImpl implements YouTubeUploadService {
  private youtube: any;
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.youtube.clientId,
      config.youtube.clientSecret,
      config.youtube.redirectUri
    );
    
    this.youtube = google.youtube({ version: 'v3', auth: this.oauth2Client });
  }

  /**
   * Upload video to YouTube
   */
  async uploadVideo(video: VideoFile, metadata: VideoMetadata): Promise<YouTubeUploadResult> {
    try {
      if (!video || !video.path) {
        throw new ValidationError('Video file is required');
      }

      if (!metadata || !metadata.title) {
        throw new ValidationError('Video metadata with title is required');
      }

      logger.info('Uploading video to YouTube', { 
        videoId: video.id,
        title: metadata.title,
        privacy: metadata.privacy 
      });

      // Validate video file exists
      await this.validateVideoFile(video.path);

      // Prepare upload parameters
      const uploadParams = this.prepareUploadParams(metadata);
      
      // Upload video
      const uploadResult = await this.performVideoUpload(video.path, uploadParams);

      logger.info('Video uploaded to YouTube successfully', { 
        videoId: video.id,
        youtubeVideoId: uploadResult.videoId,
        status: uploadResult.status 
      });

      return uploadResult;
    } catch (error) {
      logger.error('YouTube video upload failed', error as Error, { 
        videoId: video?.id,
        title: metadata?.title 
      });
      
      if (error instanceof ValidationError || error instanceof AuthenticationError) {
        throw error;
      }
      
      throw new ExternalServiceError('YouTube', `Video upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Update video status (privacy, etc.)
   */
  async updateVideoStatus(videoId: string, status: string): Promise<void> {
    try {
      if (!videoId) {
        throw new ValidationError('YouTube video ID is required');
      }

      logger.info('Updating YouTube video status', { videoId, status });

      await this.youtube.videos.update({
        part: ['status'],
        requestBody: {
          id: videoId,
          status: {
            privacyStatus: status,
          },
        },
      });

      logger.info('YouTube video status updated successfully', { videoId, status });
    } catch (error) {
      logger.error('Failed to update YouTube video status', error as Error, { videoId, status });
      throw new ExternalServiceError('YouTube', `Status update failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get video statistics
   */
  async getVideoStats(videoId: string): Promise<YouTubeVideoStats> {
    try {
      if (!videoId) {
        throw new ValidationError('YouTube video ID is required');
      }

      const response = await this.youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: [videoId],
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new ExternalServiceError('YouTube', 'Video not found');
      }

      const video = response.data.items[0];
      const stats = video.statistics;
      const snippet = video.snippet;

      return {
        viewCount: parseInt(stats.viewCount || '0', 10),
        likeCount: parseInt(stats.likeCount || '0', 10),
        commentCount: parseInt(stats.commentCount || '0', 10),
        publishedAt: snippet.publishedAt,
      };
    } catch (error) {
      logger.error('Failed to get YouTube video stats', error as Error, { videoId });
      throw new ExternalServiceError('YouTube', `Failed to get video stats: ${(error as Error).message}`);
    }
  }

  /**
   * Set authentication for user
   */
  async setAuthForUser(userId: string): Promise<void> {
    try {
      const accessToken = await authService.ensureValidToken(userId);
      
      this.oauth2Client.setCredentials({
        access_token: accessToken,
      });

      logger.debug('YouTube authentication set for user', { userId });
    } catch (error) {
      logger.error('Failed to set YouTube authentication', error as Error, { userId });
      throw new AuthenticationError('Failed to authenticate with YouTube');
    }
  }

  /**
   * Validate video file
   */
  private async validateVideoFile(videoPath: string): Promise<void> {
    try {
      const stats = await fs.stat(videoPath);
      
      if (!stats.isFile()) {
        throw new ValidationError('Video path is not a file');
      }

      // Check file size (YouTube limit is 256GB, but we'll use a more reasonable limit)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (stats.size > maxSize) {
        throw new ValidationError('Video file is too large (max 2GB)');
      }

      logger.debug('Video file validated', { videoPath, size: stats.size });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Video file validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Prepare upload parameters
   */
  private prepareUploadParams(metadata: VideoMetadata): any {
    return {
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title: metadata.title,
          description: metadata.description || '',
          tags: metadata.tags || [],
          categoryId: metadata.category || '22', // Default to People & Blogs
          defaultLanguage: 'en',
          defaultAudioLanguage: 'en',
        },
        status: {
          privacyStatus: metadata.privacy || 'private',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: null, // Will be set during upload
      },
    };
  }  /**
   
* Perform the actual video upload
   */
  private async performVideoUpload(videoPath: string, uploadParams: any): Promise<YouTubeUploadResult> {
    try {
      // Create read stream for video file
      const videoStream = require('fs').createReadStream(videoPath);
      uploadParams.media.body = videoStream;

      const response = await this.youtube.videos.insert(uploadParams);
      
      const videoData = response.data;
      
      return {
        videoId: videoData.id,
        status: videoData.status?.uploadStatus || 'uploaded',
        uploadStatus: videoData.status?.uploadStatus || 'uploaded',
        privacyStatus: videoData.status?.privacyStatus || 'private',
        publishAt: videoData.status?.publishAt,
      };
    } catch (error) {
      logger.error('Video upload to YouTube failed', error as Error);
      
      const err = error as any;
      if (err.code === 401) {
        throw new AuthenticationError('YouTube authentication failed');
      } else if (err.code === 403) {
        throw new ExternalServiceError('YouTube', 'Insufficient permissions or quota exceeded');
      } else if (err.code === 400) {
        throw new ValidationError(`YouTube API validation error: ${err.message}`);
      }
      
      throw new ExternalServiceError('YouTube', `Upload failed: ${err.message}`);
    }
  }

  /**
   * Upload thumbnail for video
   */
  async uploadThumbnail(videoId: string, thumbnailPath: string): Promise<void> {
    try {
      if (!videoId) {
        throw new ValidationError('YouTube video ID is required');
      }

      if (!thumbnailPath) {
        throw new ValidationError('Thumbnail path is required');
      }

      logger.info('Uploading thumbnail to YouTube', { videoId, thumbnailPath });

      // Validate thumbnail file
      await this.validateThumbnailFile(thumbnailPath);

      // Create read stream for thumbnail
      const thumbnailStream = require('fs').createReadStream(thumbnailPath);

      await this.youtube.thumbnails.set({
        videoId: videoId,
        media: {
          body: thumbnailStream,
        },
      });

      logger.info('Thumbnail uploaded to YouTube successfully', { videoId });
    } catch (error) {
      logger.error('Thumbnail upload failed', error as Error, { videoId, thumbnailPath });
      throw new ExternalServiceError('YouTube', `Thumbnail upload failed: ${(error as Error).message}`);
    }
  }

  /**
   * Validate thumbnail file
   */
  private async validateThumbnailFile(thumbnailPath: string): Promise<void> {
    try {
      const stats = await fs.stat(thumbnailPath);
      
      if (!stats.isFile()) {
        throw new ValidationError('Thumbnail path is not a file');
      }

      // YouTube thumbnail requirements: max 2MB, min 640x360, max 2560x1440
      const maxSize = 2 * 1024 * 1024; // 2MB
      if (stats.size > maxSize) {
        throw new ValidationError('Thumbnail file is too large (max 2MB)');
      }

      logger.debug('Thumbnail file validated', { thumbnailPath, size: stats.size });
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError(`Thumbnail validation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get upload quota usage
   */
  async getQuotaUsage(): Promise<{ used: number; limit: number; remaining: number }> {
    try {
      // YouTube API doesn't provide direct quota usage info
      // This would typically be tracked internally or estimated
      return {
        used: 0,
        limit: 10000, // Default daily quota
        remaining: 10000,
      };
    } catch (error) {
      logger.error('Failed to get quota usage', error as Error);
      throw new ExternalServiceError('YouTube', `Failed to get quota usage: ${(error as Error).message}`);
    }
  }

  /**
   * Schedule video publication
   */
  async scheduleVideoPublication(videoId: string, publishAt: Date): Promise<void> {
    try {
      if (!videoId) {
        throw new ValidationError('YouTube video ID is required');
      }

      if (!publishAt || publishAt <= new Date()) {
        throw new ValidationError('Publish date must be in the future');
      }

      logger.info('Scheduling video publication', { videoId, publishAt });

      await this.youtube.videos.update({
        part: ['status'],
        requestBody: {
          id: videoId,
          status: {
            privacyStatus: 'private',
            publishAt: publishAt.toISOString(),
          },
        },
      });

      logger.info('Video publication scheduled successfully', { videoId, publishAt });
    } catch (error) {
      logger.error('Failed to schedule video publication', error as Error, { videoId, publishAt });
      throw new ExternalServiceError('YouTube', `Failed to schedule publication: ${(error as Error).message}`);
    }
  }

  /**
   * Get video upload progress (placeholder for resumable uploads)
   */
  async getUploadProgress(uploadId: string): Promise<{ progress: number; status: string }> {
    // This would be implemented with resumable uploads
    // For now, return placeholder data
    return {
      progress: 100,
      status: 'completed',
    };
  }

  /**
   * Cancel video upload (placeholder for resumable uploads)
   */
  async cancelUpload(uploadId: string): Promise<void> {
    // This would be implemented with resumable uploads
    logger.info('Upload cancellation requested', { uploadId });
  }
}

export const youtubeUploadService = new YouTubeUploadServiceImpl();