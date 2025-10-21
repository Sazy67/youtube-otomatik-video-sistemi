import axios from 'axios';
import { VisualContent } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import {
  ExternalServiceError,
  ValidationError,
  FileStorageError
} from '../utils/errors';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

export class VisualContentService {
  private unsplashAccessKey: string;
  private pexelsApiKey: string;
  private cacheDir: string;

  constructor() {
    this.unsplashAccessKey = config.unsplash.accessKey;
    this.pexelsApiKey = process.env.PEXELS_API_KEY || '';
    this.cacheDir = path.join(config.storage.basePath, 'visual-cache');
  }

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

      logger.info('Finding visual content', { topic, duration });

      // Calculate how many images/videos we need
      const averageImageDuration = 5; // seconds per image
      const neededVisuals = Math.ceil(duration / averageImageDuration);

      // Extract keywords from topic for better search
      const keywords = this.extractKeywords(topic);

      // Search for visual content from multiple sources
      const visualContent: VisualContent[] = [];

      // Get images from Unsplash
      const unsplashImages = await this.searchUnsplashImages(keywords, Math.ceil(neededVisuals * 0.7));
      visualContent.push(...unsplashImages);

      // Get videos from Pexels (if API key available)
      if (this.pexelsApiKey) {
        const pexelsVideos = await this.searchPexelsVideos(keywords, Math.ceil(neededVisuals * 0.3));
        visualContent.push(...pexelsVideos);
      }

      // If we don't have enough content, get more images
      if (visualContent.length < neededVisuals) {
        const additionalImages = await this.searchUnsplashImages(
          [topic],
          neededVisuals - visualContent.length
        );
        visualContent.push(...additionalImages);
      }

      // Assign timing to visual content
      const timedVisualContent = this.assignTimingToVisuals(visualContent, duration);

      logger.info('Visual content found successfully', {
        topic,
        totalVisuals: timedVisualContent.length,
        images: timedVisualContent.filter(v => v.type === 'image').length,
        videos: timedVisualContent.filter(v => v.type === 'video').length
      });

      return timedVisualContent;
    } catch (error) {
      logger.error('Failed to find visual content', error as Error, { topic, duration });

      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ExternalServiceError('VisualContent', `Failed to find visual content: ${(error as Error).message}`);
    }
  }

  /**
   * Search Unsplash for images
   */
  private async searchUnsplashImages(keywords: string[], count: number): Promise<VisualContent[]> {
    try {
      if (!this.unsplashAccessKey) {
        logger.warn('Unsplash API key not configured, using placeholder images');
        return this.generatePlaceholderImages(keywords, count);
      }

      const query = keywords.join(' ');
      const url = `https://api.unsplash.com/search/photos`;

      const response = await axios.get(url, {
        params: {
          query,
          per_page: Math.min(count, 30), // Unsplash limit
          orientation: 'landscape',
          content_filter: 'high',
        },
        headers: {
          'Authorization': `Client-ID ${this.unsplashAccessKey}`,
        },
        timeout: 10000,
      });

      const images = response.data.results || [];

      return images.map((image: any) => ({
        type: 'image' as const,
        source: image.urls.regular,
        duration: 5, // Default 5 seconds per image
        startTime: 0, // Will be set later
        url: image.urls.regular,
      }));
    } catch (error) {
      logger.warn('Unsplash search failed, using placeholder images', { error: (error as Error).message });
      return this.generatePlaceholderImages(keywords, count);
    }
  }

  /**
   * Search Pexels for videos
   */
  private async searchPexelsVideos(keywords: string[], count: number): Promise<VisualContent[]> {
    try {
      if (!this.pexelsApiKey) {
        logger.debug('Pexels API key not configured, skipping video search');
        return [];
      }

      const query = keywords.join(' ');
      const url = `https://api.pexels.com/videos/search`;

      const response = await axios.get(url, {
        params: {
          query,
          per_page: Math.min(count, 15), // Pexels limit
          orientation: 'landscape',
        },
        headers: {
          'Authorization': this.pexelsApiKey,
        },
        timeout: 10000,
      });

      const videos = response.data.videos || [];

      return videos.map((video: any) => {
        // Get medium quality video file
        const videoFile = video.video_files.find((file: any) =>
          file.quality === 'hd' || file.quality === 'sd'
        ) || video.video_files[0];

        return {
          type: 'video' as const,
          source: videoFile.link,
          duration: Math.min(video.duration || 10, 15), // Max 15 seconds per video
          startTime: 0, // Will be set later
          url: videoFile.link,
        };
      });
    } catch (error) {
      logger.warn('Pexels search failed', { error: (error as Error).message });
      return [];
    }
  }

  /**
   * Generate placeholder images when external APIs fail
   */
  private generatePlaceholderImages(keywords: string[], count: number): VisualContent[] {
    const placeholders: VisualContent[] = [];

    for (let i = 0; i < count; i++) {
      const keyword = keywords[i % keywords.length] || 'placeholder';
      placeholders.push({
        type: 'image',
        source: `https://via.placeholder.com/1920x1080/4A90E2/FFFFFF?text=${encodeURIComponent(keyword)}`,
        duration: 5,
        startTime: 0,
        url: `https://via.placeholder.com/1920x1080/4A90E2/FFFFFF?text=${encodeURIComponent(keyword)}`,
      });
    }

    return placeholders;
  }

  /**
   * Extract keywords from topic
   */
  private extractKeywords(topic: string): string[] {
    // Remove common stop words and extract meaningful keywords
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'how', 'what', 'why', 'when', 'where', 'who', 'which', 'that', 'this', 'these', 'those',
      'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did'
    ]);

    const words = topic.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Return unique keywords, max 5
    return [...new Set(words)].slice(0, 5);
  }

  /**
   * Assign timing to visual content
   */
  private assignTimingToVisuals(visuals: VisualContent[], totalDuration: number): VisualContent[] {
    if (visuals.length === 0) {
      return [];
    }

    const timedVisuals: VisualContent[] = [];
    let currentTime = 0;
    let visualIndex = 0;

    while (currentTime < totalDuration && visualIndex < visuals.length * 3) { // Prevent infinite loop
      const visual = visuals[visualIndex % visuals.length];
      const remainingTime = totalDuration - currentTime;
      const visualDuration = Math.min(visual.duration, remainingTime);

      if (visualDuration > 0) {
        timedVisuals.push({
          ...visual,
          startTime: currentTime,
          duration: visualDuration,
        });

        currentTime += visualDuration;
      }

      visualIndex++;
    }

    return timedVisuals;
  }

  /**
   * Download and cache visual content
   */
  async downloadAndCacheVisual(visual: VisualContent): Promise<string> {
    try {
      const visualId = uuidv4();
      const extension = visual.type === 'video' ? 'mp4' : 'jpg';
      const filename = `${visual.type}_${visualId}.${extension}`;
      const filePath = path.join(this.cacheDir, filename);

      // Ensure cache directory exists
      await fs.mkdir(this.cacheDir, { recursive: true });

      // Download the visual content
      const response = await axios.get(visual.source, {
        responseType: 'arraybuffer',
        timeout: 30000, // 30 seconds timeout
        headers: {
          'User-Agent': 'YouTube-Automation-System/1.0',
        },
      });

      // Save to cache
      await fs.writeFile(filePath, response.data);

      logger.debug('Visual content cached', {
        visualId,
        filename,
        size: response.data.length,
        type: visual.type
      });

      return filePath;
    } catch (error) {
      logger.error('Failed to download and cache visual', error as Error, {
        source: visual.source,
        type: visual.type
      });
      throw new FileStorageError(`Failed to cache visual content: ${(error as Error).message}`);
    }
  }

  /**
   * Get visual content with caching
   */
  async getVisualContentWithCache(topic: string, duration: number): Promise<VisualContent[]> {
    try {
      // Find visual content
      const visuals = await this.findVisualContent(topic, duration);

      // Download and cache visuals
      const cachedVisuals: VisualContent[] = [];

      for (const visual of visuals) {
        try {
          const cachedPath = await this.downloadAndCacheVisual(visual);
          cachedVisuals.push({
            ...visual,
            source: cachedPath, // Update source to local cached file
          });
        } catch (error) {
          logger.warn('Failed to cache visual, using original URL', {
            error: (error as Error).message,
            originalSource: visual.source
          });
          cachedVisuals.push(visual); // Keep original if caching fails
        }
      }

      return cachedVisuals;
    } catch (error) {
      logger.error('Failed to get visual content with cache', error as Error, { topic, duration });
      throw error;
    }
  }

  /**
   * Clean up cached files older than specified days
   */
  async cleanupCache(olderThanDays: number = 7): Promise<void> {
    try {
      const cacheExists = await fs.access(this.cacheDir).then(() => true).catch(() => false);
      if (!cacheExists) {
        return;
      }

      const files = await fs.readdir(this.cacheDir);
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.cacheDir, file);
        const stats = await fs.stat(filePath);

        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info('Cache cleanup completed', {
        deletedFiles: deletedCount,
        olderThanDays
      });
    } catch (error) {
      logger.error('Cache cleanup failed', error as Error);
    }
  }

  /**
   * Search for specific type of visual content
   */
  async searchSpecificContent(
    query: string,
    type: 'image' | 'video',
    count: number = 10
  ): Promise<VisualContent[]> {
    try {
      const keywords = this.extractKeywords(query);

      if (type === 'image') {
        return await this.searchUnsplashImages(keywords, count);
      } else {
        return await this.searchPexelsVideos(keywords, count);
      }
    } catch (error) {
      logger.error('Specific content search failed', error as Error, { query, type, count });
      throw error;
    }
  }
}

export const visualContentService = new VisualContentService();