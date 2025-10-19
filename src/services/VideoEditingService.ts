import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs/promises';
import { AudioFile, VideoFile, VisualContent } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  VideoProcessingError, 
  ValidationError,
  FileStorageError 
} from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export class VideoEditingService {
  private tempDir: string;
  private outputDir: string;

  constructor() {
    this.tempDir = config.video.tempDir;
    this.outputDir = path.join(config.storage.basePath, 'videos');
  }

  /**
   * Create video from audio and visual content
   */
  async createVideo(audio: AudioFile, visuals: VisualContent[]): Promise<VideoFile> {
    try {
      if (!audio || !audio.path) {
        throw new ValidationError('Audio file is required');
      }

      if (!visuals || visuals.length === 0) {
        throw new ValidationError('Visual content is required');
      }

      logger.info('Creating video', { 
        audioId: audio.id,
        visualCount: visuals.length,
        audioDuration: audio.duration 
      });

      // Ensure directories exist
      await this.ensureDirectories();

      // Prepare visual content for video creation
      const preparedVisuals = await this.prepareVisualContent(visuals);

      // Create video montage
      const videoFile = await this.createVideoMontage(audio, preparedVisuals);

      logger.info('Video created successfully', { 
        videoId: videoFile.id,
        duration: videoFile.duration,
        size: videoFile.size 
      });

      return videoFile;
    } catch (error) {
      logger.error('Video creation failed', error as Error, { 
        audioId: audio?.id,
        visualCount: visuals?.length 
      });
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new VideoProcessingError(`Video creation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Prepare visual content for video processing
   */
  private async prepareVisualContent(visuals: VisualContent[]): Promise<VisualContent[]> {
    const preparedVisuals: VisualContent[] = [];

    for (const visual of visuals) {
      try {
        let processedPath = visual.source;

        // If it's a remote URL, it should already be cached by VisualContentService
        // If it's an image, we might need to resize it
        if (visual.type === 'image') {
          processedPath = await this.processImage(visual.source, visual.duration);
        } else if (visual.type === 'video') {
          processedPath = await this.processVideo(visual.source, visual.duration);
        }

        preparedVisuals.push({
          ...visual,
          source: processedPath,
        });
      } catch (error) {
        logger.warn('Failed to process visual, skipping', { 
          error: (error as Error).message,
          visualSource: visual.source 
        });
        // Skip this visual if processing fails
      }
    }

    if (preparedVisuals.length === 0) {
      throw new VideoProcessingError('No visual content could be processed');
    }

    return preparedVisuals;
  }

  /**
   * Process image for video use
   */
  private async processImage(imagePath: string, duration: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputId = uuidv4();
      const outputPath = path.join(this.tempDir, `processed_image_${outputId}.mp4`);

      ffmpeg(imagePath)
        .inputOptions([
          '-loop 1', // Loop the image
          `-t ${duration}`, // Duration
        ])
        .outputOptions([
          '-c:v libx264',
          '-t ' + duration,
          '-pix_fmt yuv420p',
          '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
          '-r 30', // Frame rate
        ])
        .output(outputPath)
        .on('end', () => {
          logger.debug('Image processed successfully', { imagePath, outputPath, duration });
          resolve(outputPath);
        })
        .on('error', (error) => {
          logger.error('Image processing failed', error, { imagePath, duration });
          reject(new VideoProcessingError(`Image processing failed: ${error.message}`));
        })
        .run();
    });
  }

  /**
   * Process video clip for montage
   */
  private async processVideo(videoPath: string, duration: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const outputId = uuidv4();
      const outputPath = path.join(this.tempDir, `processed_video_${outputId}.mp4`);

      ffmpeg(videoPath)
        .inputOptions([
          `-t ${duration}`, // Limit duration
        ])
        .outputOptions([
          '-c:v libx264',
          '-c:a aac',
          '-vf scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2',
          '-r 30',
          '-preset fast',
        ])
        .output(outputPath)
        .on('end', () => {
          logger.debug('Video processed successfully', { videoPath, outputPath, duration });
          resolve(outputPath);
        })
        .on('error', (error) => {
          logger.error('Video processing failed', error, { videoPath, duration });
          reject(new VideoProcessingError(`Video processing failed: ${error.message}`));
        })
        .run();
    });
  }

  /**
   * Create video montage from audio and visuals
   */
  private async createVideoMontage(audio: AudioFile, visuals: VisualContent[]): Promise<VideoFile> {
    return new Promise(async (resolve, reject) => {
      try {
        const videoId = uuidv4();
        const outputFilename = `video_${videoId}.mp4`;
        const outputPath = path.join(this.outputDir, outputFilename);

        // Create concat file for FFmpeg
        const concatFilePath = await this.createConcatFile(visuals);

        // Create the final video with audio
        const ffmpegCommand = ffmpeg()
          .input(concatFilePath)
          .inputOptions(['-f concat', '-safe 0'])
          .input(audio.path)
          .outputOptions([
            '-c:v libx264',
            '-c:a aac',
            '-preset medium',
            '-crf 23',
            '-movflags +faststart',
            '-shortest', // Stop when shortest input ends
          ])
          .output(outputPath);

        ffmpegCommand
          .on('progress', (progress) => {
            logger.debug('Video creation progress', { 
              percent: progress.percent,
              timemark: progress.timemark 
            });
          })
          .on('end', async () => {
            try {
              // Get video file stats
              const stats = await fs.stat(outputPath);
              
              const videoFile: VideoFile = {
                id: videoId,
                filename: outputFilename,
                path: outputPath,
                duration: audio.duration, // Use audio duration as reference
                format: 'mp4',
                resolution: config.video.outputResolution,
                size: stats.size,
              };

              // Cleanup temporary files
              await this.cleanupTempFiles([concatFilePath, ...visuals.map(v => v.source)]);

              logger.info('Video montage created successfully', { 
                videoId,
                outputPath,
                size: stats.size 
              });

              resolve(videoFile);
            } catch (error) {
              reject(new VideoProcessingError(`Failed to finalize video: ${(error as Error).message}`));
            }
          })
          .on('error', (error) => {
            logger.error('Video montage creation failed', error);
            reject(new VideoProcessingError(`Video montage failed: ${error.message}`));
          })
          .run();

      } catch (error) {
        reject(new VideoProcessingError(`Video montage setup failed: ${(error as Error).message}`));
      }
    });
  }

  /**
   * Create concat file for FFmpeg
   */
  private async createConcatFile(visuals: VisualContent[]): Promise<string> {
    try {
      const concatId = uuidv4();
      const concatPath = path.join(this.tempDir, `concat_${concatId}.txt`);
      
      const concatContent = visuals
        .map(visual => `file '${visual.source.replace(/'/g, "'\"'\"'")}'`)
        .join('\n');

      await fs.writeFile(concatPath, concatContent, 'utf8');
      
      logger.debug('Concat file created', { concatPath, visualCount: visuals.length });
      
      return concatPath;
    } catch (error) {
      throw new VideoProcessingError(`Failed to create concat file: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure required directories exist
   */
  private async ensureDirectories(): Promise<void> {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
      await fs.mkdir(this.outputDir, { recursive: true });
    } catch (error) {
      throw new FileStorageError(`Failed to create directories: ${(error as Error).message}`);
    }
  }

  /**
   * Cleanup temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        // Only delete files in temp directory to be safe
        if (filePath.includes(this.tempDir)) {
          await fs.unlink(filePath);
          logger.debug('Temp file cleaned up', { filePath });
        }
      } catch (error) {
        logger.warn('Failed to cleanup temp file', { 
          error: (error as Error).message,
          filePath 
        });
      }
    }
  }

  /**
   * Add intro/outro to video
   */
  async addIntroOutro(
    videoFile: VideoFile, 
    introPath?: string, 
    outroPath?: string
  ): Promise<VideoFile> {
    try {
      if (!introPath && !outroPath) {
        return videoFile; // Nothing to add
      }

      logger.info('Adding intro/outro to video', { 
        videoId: videoFile.id,
        hasIntro: !!introPath,
        hasOutro: !!outroPath 
      });

      const outputId = uuidv4();
      const outputFilename = `video_with_intro_outro_${outputId}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      return new Promise((resolve, reject) => {
        const inputs = [];
        
        if (introPath) inputs.push(introPath);
        inputs.push(videoFile.path);
        if (outroPath) inputs.push(outroPath);

        // Create concat file for intro/main/outro
        const concatContent = inputs.map(input => `file '${input}'`).join('\n');
        const concatPath = path.join(this.tempDir, `intro_outro_${outputId}.txt`);
        
        fs.writeFile(concatPath, concatContent, 'utf8')
          .then(() => {
            ffmpeg()
              .input(concatPath)
              .inputOptions(['-f concat', '-safe 0'])
              .outputOptions([
                '-c copy', // Copy streams without re-encoding for speed
              ])
              .output(outputPath)
              .on('end', async () => {
                try {
                  const stats = await fs.stat(outputPath);
                  
                  const newVideoFile: VideoFile = {
                    ...videoFile,
                    id: outputId,
                    filename: outputFilename,
                    path: outputPath,
                    size: stats.size,
                  };

                  // Cleanup
                  await fs.unlink(concatPath);
                  
                  resolve(newVideoFile);
                } catch (error) {
                  reject(error);
                }
              })
              .on('error', reject)
              .run();
          })
          .catch(reject);
      });
    } catch (error) {
      logger.error('Failed to add intro/outro', error as Error, { videoId: videoFile.id });
      throw new VideoProcessingError(`Failed to add intro/outro: ${(error as Error).message}`);
    }
  }

  /**
   * Optimize video for YouTube upload
   */
  async optimizeForYouTube(videoFile: VideoFile): Promise<VideoFile> {
    try {
      logger.info('Optimizing video for YouTube', { videoId: videoFile.id });

      const outputId = uuidv4();
      const outputFilename = `optimized_${outputId}.mp4`;
      const outputPath = path.join(this.outputDir, outputFilename);

      return new Promise((resolve, reject) => {
        ffmpeg(videoFile.path)
          .outputOptions([
            '-c:v libx264',
            '-preset slow', // Better compression
            '-crf 18', // High quality
            '-c:a aac',
            '-b:a 128k',
            '-movflags +faststart', // Optimize for streaming
            '-pix_fmt yuv420p', // Ensure compatibility
            '-maxrate 8000k', // YouTube recommended max bitrate
            '-bufsize 12000k',
          ])
          .output(outputPath)
          .on('end', async () => {
            try {
              const stats = await fs.stat(outputPath);
              
              const optimizedVideo: VideoFile = {
                ...videoFile,
                id: outputId,
                filename: outputFilename,
                path: outputPath,
                size: stats.size,
              };

              logger.info('Video optimized for YouTube', { 
                originalSize: videoFile.size,
                optimizedSize: stats.size,
                compression: ((videoFile.size - stats.size) / videoFile.size * 100).toFixed(2) + '%'
              });

              resolve(optimizedVideo);
            } catch (error) {
              reject(error);
            }
          })
          .on('error', (error) => {
            logger.error('YouTube optimization failed', error);
            reject(new VideoProcessingError(`YouTube optimization failed: ${error.message}`));
          })
          .run();
      });
    } catch (error) {
      logger.error('Failed to optimize video for YouTube', error as Error, { videoId: videoFile.id });
      throw error;
    }
  }

  /**
   * Get video information
   */
  async getVideoInfo(videoPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (error, metadata) => {
        if (error) {
          reject(new VideoProcessingError(`Failed to get video info: ${error.message}`));
        } else {
          resolve(metadata);
        }
      });
    });
  }
}

export const videoEditingService = new VideoEditingService();