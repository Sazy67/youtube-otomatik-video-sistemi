import { createCanvas, loadImage, registerFont, Canvas, CanvasRenderingContext2D } from 'canvas';
import fs from 'fs/promises';
import path from 'path';
import { ImageFile, ThumbnailStyle } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  ValidationError,
  FileStorageError 
} from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export class ThumbnailGenerationService {
  private outputDir: string;
  private templatesDir: string;

  constructor() {
    this.outputDir = path.join(config.storage.basePath, 'thumbnails');
    this.templatesDir = path.join(__dirname, '../../assets/thumbnail-templates');
  }

  /**
   * Generate thumbnail for a topic
   */
  async generateThumbnail(topic: string, style: ThumbnailStyle): Promise<ImageFile> {
    try {
      if (!topic || topic.trim().length === 0) {
        throw new ValidationError('Topic is required for thumbnail generation');
      }

      logger.info('Generating thumbnail', { topic, style: style.template });

      // Ensure output directory exists
      await fs.mkdir(this.outputDir, { recursive: true });

      // Create canvas
      const canvas = createCanvas(config.thumbnail.width, config.thumbnail.height);
      const ctx = canvas.getContext('2d');

      // Generate thumbnail based on style
      await this.renderThumbnail(ctx, canvas, topic, style);

      // Save thumbnail
      const thumbnailFile = await this.saveThumbnail(canvas, topic);

      logger.info('Thumbnail generated successfully', { 
        thumbnailId: thumbnailFile.id,
        topic,
        style: style.template 
      });

      return thumbnailFile;
    } catch (error) {
      logger.error('Thumbnail generation failed', error as Error, { topic, style });
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new FileStorageError(`Thumbnail generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Render thumbnail on canvas
   */
  private async renderThumbnail(
    ctx: CanvasRenderingContext2D, 
    canvas: Canvas, 
    topic: string, 
    style: ThumbnailStyle
  ): Promise<void> {
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    switch (style.template) {
      case 'minimal':
        await this.renderMinimalThumbnail(ctx, width, height, topic, style);
        break;
      case 'colorful':
        await this.renderColorfulThumbnail(ctx, width, height, topic, style);
        break;
      case 'professional':
        await this.renderProfessionalThumbnail(ctx, width, height, topic, style);
        break;
      default:
        await this.renderMinimalThumbnail(ctx, width, height, topic, style);
    }
  }

  /**
   * Render minimal style thumbnail
   */
  private async renderMinimalThumbnail(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    topic: string,
    style: ThumbnailStyle
  ): Promise<void> {
    // Background
    ctx.fillStyle = style.backgroundColor || '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Add subtle gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.1)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Title text
    await this.renderText(ctx, topic, {
      x: width / 2,
      y: height / 2,
      fontSize: style.fontSize || 72,
      fontColor: style.fontColor || '#333333',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center',
      maxWidth: width * 0.9,
    });

    // Add minimal border
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 4;
    ctx.strokeRect(20, 20, width - 40, height - 40);
  }

  /**
   * Render colorful style thumbnail
   */
  private async renderColorfulThumbnail(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    topic: string,
    style: ThumbnailStyle
  ): Promise<void> {
    // Colorful gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#FF6B6B');
    gradient.addColorStop(0.3, '#4ECDC4');
    gradient.addColorStop(0.6, '#45B7D1');
    gradient.addColorStop(1, '#96CEB4');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add overlay for text readability
    ctx.fillStyle = `rgba(0, 0, 0, ${style.overlayOpacity || 0.3})`;
    ctx.fillRect(0, 0, width, height);

    // Decorative shapes
    await this.addDecorativeShapes(ctx, width, height);

    // Title text with shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    await this.renderText(ctx, topic, {
      x: width / 2,
      y: height / 2,
      fontSize: style.fontSize || 80,
      fontColor: style.fontColor || '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center',
      maxWidth: width * 0.85,
    });

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  /**
   * Render professional style thumbnail
   */
  private async renderProfessionalThumbnail(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    topic: string,
    style: ThumbnailStyle
  ): Promise<void> {
    // Professional gradient background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#2C3E50');
    gradient.addColorStop(1, '#34495E');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add professional pattern
    await this.addProfessionalPattern(ctx, width, height);

    // Brand bar at bottom
    ctx.fillStyle = '#E74C3C';
    ctx.fillRect(0, height - 80, width, 80);

    // Main title
    await this.renderText(ctx, topic, {
      x: width / 2,
      y: height / 2 - 40,
      fontSize: style.fontSize || 64,
      fontColor: style.fontColor || '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'bold',
      textAlign: 'center',
      maxWidth: width * 0.9,
    });

    // Subtitle or branding
    await this.renderText(ctx, 'Educational Content', {
      x: width / 2,
      y: height - 25,
      fontSize: 32,
      fontColor: '#FFFFFF',
      fontFamily: 'Arial, sans-serif',
      fontWeight: 'normal',
      textAlign: 'center',
      maxWidth: width * 0.8,
    });

    // Professional border
    ctx.strokeStyle = '#BDC3C7';
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, width - 6, height - 6);
  }

  /**
   * Render text with word wrapping
   */
  private async renderText(
    ctx: CanvasRenderingContext2D,
    text: string,
    options: {
      x: number;
      y: number;
      fontSize: number;
      fontColor: string;
      fontFamily: string;
      fontWeight: string;
      textAlign: 'center' | 'left' | 'right';
      maxWidth: number;
    }
  ): Promise<void> {
    ctx.font = `${options.fontWeight} ${options.fontSize}px ${options.fontFamily}`;
    ctx.fillStyle = options.fontColor;
    ctx.textAlign = options.textAlign;
    ctx.textBaseline = 'middle';

    // Word wrapping
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > options.maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }

    // Render lines
    const lineHeight = options.fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = options.y - (totalHeight / 2) + (lineHeight / 2);

    lines.forEach((line, index) => {
      ctx.fillText(line, options.x, startY + (index * lineHeight));
    });
  }

  /**
   * Add decorative shapes for colorful style
   */
  private async addDecorativeShapes(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): Promise<void> {
    // Add some circles
    const shapes = [
      { x: width * 0.1, y: height * 0.2, radius: 60, color: 'rgba(255, 255, 255, 0.1)' },
      { x: width * 0.9, y: height * 0.8, radius: 80, color: 'rgba(255, 255, 255, 0.08)' },
      { x: width * 0.8, y: height * 0.1, radius: 40, color: 'rgba(255, 255, 255, 0.12)' },
    ];

    shapes.forEach(shape => {
      ctx.beginPath();
      ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
      ctx.fillStyle = shape.color;
      ctx.fill();
    });
  }

  /**
   * Add professional pattern
   */
  private async addProfessionalPattern(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number
  ): Promise<void> {
    // Add subtle geometric pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 2;

    // Draw diagonal lines
    for (let i = 0; i < width + height; i += 100) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i - height, height);
      ctx.stroke();
    }
  }

  /**
   * Save thumbnail to file
   */
  private async saveThumbnail(canvas: Canvas, topic: string): Promise<ImageFile> {
    try {
      const thumbnailId = uuidv4();
      const filename = `thumbnail_${thumbnailId}.${config.thumbnail.format}`;
      const filePath = path.join(this.outputDir, filename);

      // Convert canvas to buffer
      const buffer = canvas.toBuffer('image/jpeg', { quality: config.thumbnail.quality / 100 });

      // Save file
      await fs.writeFile(filePath, buffer);

      const imageFile: ImageFile = {
        id: thumbnailId,
        filename,
        path: filePath,
        format: config.thumbnail.format,
        width: config.thumbnail.width,
        height: config.thumbnail.height,
        size: buffer.length,
      };

      logger.debug('Thumbnail saved', { 
        thumbnailId,
        filename,
        size: buffer.length 
      });

      return imageFile;
    } catch (error) {
      throw new FileStorageError(`Failed to save thumbnail: ${(error as Error).message}`);
    }
  }

  /**
   * Generate multiple thumbnail variations
   */
  async generateThumbnailVariations(
    topic: string,
    styles: ThumbnailStyle[]
  ): Promise<ImageFile[]> {
    try {
      logger.info('Generating thumbnail variations', { 
        topic, 
        styleCount: styles.length 
      });

      const thumbnails: ImageFile[] = [];

      for (const style of styles) {
        try {
          const thumbnail = await this.generateThumbnail(topic, style);
          thumbnails.push(thumbnail);
        } catch (error) {
          logger.warn('Failed to generate thumbnail variation', { 
            error: (error as Error).message,
            style: style.template 
          });
        }
      }

      logger.info('Thumbnail variations generated', { 
        topic,
        generated: thumbnails.length,
        requested: styles.length 
      });

      return thumbnails;
    } catch (error) {
      logger.error('Failed to generate thumbnail variations', error as Error, { topic });
      throw error;
    }
  }

  /**
   * Create thumbnail from video frame
   */
  async createThumbnailFromVideo(
    videoPath: string,
    timestamp: number = 30,
    style?: ThumbnailStyle
  ): Promise<ImageFile> {
    try {
      // This would require FFmpeg integration to extract frame
      // For now, we'll create a placeholder implementation
      logger.info('Creating thumbnail from video frame', { videoPath, timestamp });

      // Extract topic from video filename or use default
      const topic = path.basename(videoPath, path.extname(videoPath));
      
      const defaultStyle: ThumbnailStyle = {
        template: 'professional',
        fontSize: 64,
        fontColor: '#FFFFFF',
        backgroundColor: '#2C3E50',
        overlayOpacity: 0.3,
      };

      return await this.generateThumbnail(topic, style || defaultStyle);
    } catch (error) {
      logger.error('Failed to create thumbnail from video', error as Error, { videoPath });
      throw error;
    }
  }

  /**
   * Get default thumbnail styles
   */
  getDefaultStyles(): ThumbnailStyle[] {
    return [
      {
        template: 'minimal',
        fontSize: 72,
        fontColor: '#333333',
        backgroundColor: '#FFFFFF',
        overlayOpacity: 0.1,
      },
      {
        template: 'colorful',
        fontSize: 80,
        fontColor: '#FFFFFF',
        backgroundColor: '#FF6B6B',
        overlayOpacity: 0.3,
      },
      {
        template: 'professional',
        fontSize: 64,
        fontColor: '#FFFFFF',
        backgroundColor: '#2C3E50',
        overlayOpacity: 0.2,
      },
    ];
  }

  /**
   * Cleanup old thumbnails
   */
  async cleanupOldThumbnails(olderThanDays: number = 30): Promise<void> {
    try {
      const files = await fs.readdir(this.outputDir);
      const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      
      for (const file of files) {
        const filePath = path.join(this.outputDir, file);
        const stats = await fs.stat(filePath);
        
        if (stats.mtime.getTime() < cutoffTime) {
          await fs.unlink(filePath);
          deletedCount++;
        }
      }

      logger.info('Thumbnail cleanup completed', { 
        deletedFiles: deletedCount,
        olderThanDays 
      });
    } catch (error) {
      logger.error('Thumbnail cleanup failed', error as Error);
    }
  }
}

export const thumbnailGenerationService = new ThumbnailGenerationService();