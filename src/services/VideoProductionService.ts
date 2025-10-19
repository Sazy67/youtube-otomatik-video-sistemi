import { VideoProductionService } from '../types/services';
import { VisualContent, AudioFile, VideoFile, ImageFile, ThumbnailStyle } from '../types';
import { visualContentService } from './VisualContentService';
import { videoEditingService } from './VideoEditingService';
import { thumbnailGenerationService } from './ThumbnailGenerationService';
import { logger } from '../utils/logger';
import { ValidationError, VideoProcessingError } from '../utils/errors';

export class VideoProductionServiceImpl implements VideoProductionService {
  /**
   * Find visual content for a topic
   */
  async findVisualContent(topic: string, duration: number): Promise<VisualContent[]> {
    try {
      if (!topic || topic.trim().length === 0) {
        throw new ValidationError('Topic is required');
      }

      if (duration < 30 || duration > 1800) {
        throw new ValidationError('Duration must be between 30 and 1800 seconds');
      }

      logger.info('Finding visual content for video production', { topic, duration });

      // Use visual content service to find and cache content
      const visuals = await visualContentService.getVisualContentWithCache(topic, duration);

      if (visuals.length === 0) {
        throw new VideoProcessingError('No visual content found for topic');
      }

      logger.info('Visual content found for video production', { 
        topic, 
        visualCount: visuals.length,
        totalDuration: visuals.reduce((sum, v) => sum + v.duration, 0)
      });

      return visuals;
    } catch (error) {
      logger.error('Failed to find visual content for video production', error as Error, { topic, duration });
      throw error;
    }
  }

  /**
   * Create video from audio and visuals
   */
  async createVideo(audio: AudioFile, visuals: VisualContent[]): Promise<VideoFile> {
    try {
      if (!audio || !audio.path) {
        throw new ValidationError('Audio file is required');
      }

      if (!visuals || visuals.length === 0) {
        throw new ValidationError('Visual content is required');
      }

      logger.info('Creating video from audio and visuals', { 
        audioId: audio.id,
        audioDuration: audio.duration,
        visualCount: visuals.length 
      });

      // Create the video using video editing service
      let videoFile = await videoEditingService.createVideo(audio, visuals);

      // Optimize for YouTube upload
      videoFile = await videoEditingService.optimizeForYouTube(videoFile);

      logger.info('Video created successfully', { 
        videoId: videoFile.id,
        duration: videoFile.duration,
        size: videoFile.size,
        resolution: videoFile.resolution 
      });

      return videoFile;
    } catch (error) {
      logger.error('Failed to create video', error as Error, { 
        audioId: audio?.id,
        visualCount: visuals?.length 
      });
      throw error;
    }
  }

  /**
   * Generate thumbnail for a topic
   */
  async generateThumbnail(topic: string, style: ThumbnailStyle): Promise<ImageFile> {
    try {
      if (!topic || topic.trim().length === 0) {
        throw new ValidationError('Topic is required');
      }

      if (!style || !style.template) {
        throw new ValidationError('Thumbnail style is required');
      }

      logger.info('Generating thumbnail for video', { topic, style: style.template });

      const thumbnail = await thumbnailGenerationService.generateThumbnail(topic, style);

      logger.info('Thumbnail generated successfully', { 
        thumbnailId: thumbnail.id,
        topic,
        style: style.template 
      });

      return thumbnail;
    } catch (error) {
      logger.error('Failed to generate thumbnail', error as Error, { topic, style });
      throw error;
    }
  }

  /**
   * Create complete video package (video + thumbnail)
   */
  async createCompleteVideoPackage(
    audio: AudioFile,
    topic: string,
    duration: number,
    thumbnailStyle?: ThumbnailStyle
  ): Promise<{ video: VideoFile; thumbnail: ImageFile; visuals: VisualContent[] }> {
    try {
      logger.info('Creating complete video package', { 
        audioId: audio.id,
        topic,
        duration 
      });

      // Find visual content
      const visuals = await this.findVisualContent(topic, duration);

      // Create video
      const video = await this.createVideo(audio, visuals);

      // Generate thumbnail
      const defaultStyle: ThumbnailStyle = {
        template: 'professional',
        fontSize: 64,
        fontColor: '#FFFFFF',
        backgroundColor: '#2C3E50',
        overlayOpacity: 0.3,
      };

      const thumbnail = await this.generateThumbnail(topic, thumbnailStyle || defaultStyle);

      logger.info('Complete video package created successfully', { 
        videoId: video.id,
        thumbnailId: thumbnail.id,
        topic 
      });

      return { video, thumbnail, visuals };
    } catch (error) {
      logger.error('Failed to create complete video package', error as Error, { 
        audioId: audio?.id,
        topic,
        duration 
      });
      throw error;
    }
  }

  /**
   * Create multiple thumbnail variations
   */
  async generateThumbnailVariations(topic: string): Promise<ImageFile[]> {
    try {
      logger.info('Generating thumbnail variations', { topic });

      const styles = thumbnailGenerationService.getDefaultStyles();
      const thumbnails = await thumbnailGenerationService.generateThumbnailVariations(topic, styles);

      logger.info('Thumbnail variations generated', { 
        topic,
        count: thumbnails.length 
      });

      return thumbnails;
    } catch (error) {
      logger.error('Failed to generate thumbnail variations', error as Error, { topic });
      throw error;
    }
  }

  /**
   * Add intro/outro to existing video
   */
  async addIntroOutroToVideo(
    videoFile: VideoFile,
    introPath?: string,
    outroPath?: string
  ): Promise<VideoFile> {
    try {
      logger.info('Adding intro/outro to video', { 
        videoId: videoFile.id,
        hasIntro: !!introPath,
        hasOutro: !!outroPath 
      });

      const enhancedVideo = await videoEditingService.addIntroOutro(videoFile, introPath, outroPath);

      logger.info('Intro/outro added successfully', { 
        originalVideoId: videoFile.id,
        enhancedVideoId: enhancedVideo.id 
      });

      return enhancedVideo;
    } catch (error) {
      logger.error('Failed to add intro/outro to video', error as Error, { videoId: videoFile.id });
      throw error;
    }
  }

  /**
   * Get video production statistics
   */
  async getProductionStats(): Promise<{
    totalVideosCreated: number;
    totalThumbnailsGenerated: number;
    averageProcessingTime: number;
    totalStorageUsed: number;
  }> {
    try {
      // This would typically query a database for statistics
      // For now, return placeholder data
      return {
        totalVideosCreated: 0,
        totalThumbnailsGenerated: 0,
        averageProcessingTime: 0,
        totalStorageUsed: 0,
      };
    } catch (error) {
      logger.error('Failed to get production stats', error as Error);
      throw error;
    }
  }

  /**
   * Cleanup temporary production files
   */
  async cleanupProductionFiles(olderThanDays: number = 7): Promise<void> {
    try {
      logger.info('Starting production files cleanup', { olderThanDays });

      // Cleanup visual content cache
      await visualContentService.cleanupCache(olderThanDays);

      // Cleanup old thumbnails
      await thumbnailGenerationService.cleanupOldThumbnails(olderThanDays);

      logger.info('Production files cleanup completed');
    } catch (error) {
      logger.error('Production files cleanup failed', error as Error);
      throw error;
    }
  }

  /**
   * Validate video production requirements
   */
  validateProductionRequirements(
    audio: AudioFile,
    topic: string,
    duration: number
  ): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!audio || !audio.path) {
      errors.push('Audio file is required');
    }

    if (!topic || topic.trim().length === 0) {
      errors.push('Topic is required');
    }

    if (duration < 30) {
      errors.push('Duration must be at least 30 seconds');
    }

    if (duration > 1800) {
      errors.push('Duration cannot exceed 30 minutes');
    }

    if (audio && audio.duration && Math.abs(audio.duration - duration) > 30) {
      errors.push('Audio duration does not match target duration');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Estimate production time
   */
  estimateProductionTime(duration: number, visualCount?: number): number {
    // Base time for video processing (in seconds)
    const baseTime = 60; // 1 minute base
    
    // Time per second of video (processing is typically 2-3x real time)
    const timePerSecond = 2.5;
    
    // Time per visual (downloading, processing)
    const timePerVisual = 10;
    
    const estimatedVisuals = visualCount || Math.ceil(duration / 5);
    
    const totalTime = baseTime + (duration * timePerSecond) + (estimatedVisuals * timePerVisual);
    
    return Math.round(totalTime);
  }

  /**
   * Get supported video formats
   */
  getSupportedFormats(): string[] {
    return ['mp4', 'avi', 'mov', 'mkv'];
  }

  /**
   * Get supported thumbnail formats
   */
  getSupportedThumbnailFormats(): string[] {
    return ['jpeg', 'jpg', 'png'];
  }
}

export const videoProductionService = new VideoProductionServiceImpl();