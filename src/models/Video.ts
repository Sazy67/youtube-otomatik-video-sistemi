import { Video, VideoStatus } from '../types';
import { VideoRepository } from '../types/services';
import { db } from '../database/connection';
import { NotFoundError, DatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

export class VideoModel implements VideoRepository {
  async create(videoData: Omit<Video, 'id' | 'createdAt' | 'updatedAt'>): Promise<Video> {
    try {
      const query = `
        INSERT INTO videos (project_id, topic, script, audio_file, video_file, thumbnail_file, youtube_video_id, status, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, project_id, topic, script, audio_file, video_file, thumbnail_file, youtube_video_id, status, metadata, created_at, updated_at
      `;
      
      const values = [
        videoData.projectId,
        videoData.topic,
        videoData.script ? JSON.stringify(videoData.script) : null,
        videoData.audioFile || null,
        videoData.videoFile || null,
        videoData.thumbnailFile || null,
        videoData.youtubeVideoId || null,
        videoData.status || 'draft',
        JSON.stringify(videoData.metadata),
      ];

      const result = await db.query<any>(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create video');
      }

      const video = this.mapDatabaseRowToVideo(result.rows[0]);
      logger.info('Video created successfully', { 
        videoId: video.id, 
        projectId: video.projectId,
        topic: video.topic 
      });
      
      return video;
    } catch (error) {
      logger.error('Failed to create video', error as Error, { 
        projectId: videoData.projectId,
        topic: videoData.topic 
      });
      throw error;
    }
  }

  async findById(id: string): Promise<Video | null> {
    try {
      const query = `
        SELECT id, project_id, topic, script, audio_file, video_file, thumbnail_file, youtube_video_id, status, metadata, created_at, updated_at
        FROM videos 
        WHERE id = $1
      `;
      
      const result = await db.query<any>(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToVideo(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find video by ID', error as Error, { videoId: id });
      throw new DatabaseError(`Failed to find video: ${(error as Error).message}`);
    }
  }

  async findByProjectId(projectId: string): Promise<Video[]> {
    try {
      const query = `
        SELECT id, project_id, topic, script, audio_file, video_file, thumbnail_file, youtube_video_id, status, metadata, created_at, updated_at
        FROM videos 
        WHERE project_id = $1
        ORDER BY created_at DESC
      `;
      
      const result = await db.query<any>(query, [projectId]);
      
      return result.rows.map(row => this.mapDatabaseRowToVideo(row));
    } catch (error) {
      logger.error('Failed to find videos by project ID', error as Error, { projectId });
      throw new DatabaseError(`Failed to find videos: ${(error as Error).message}`);
    }
  }

  async update(id: string, updates: Partial<Video>): Promise<Video> {
    try {
      const existingVideo = await this.findById(id);
      if (!existingVideo) {
        throw new NotFoundError('Video', { id });
      }

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.topic !== undefined) {
        updateFields.push(`topic = $${paramIndex++}`);
        values.push(updates.topic);
      }

      if (updates.script !== undefined) {
        updateFields.push(`script = $${paramIndex++}`);
        values.push(updates.script ? JSON.stringify(updates.script) : null);
      }

      if (updates.audioFile !== undefined) {
        updateFields.push(`audio_file = $${paramIndex++}`);
        values.push(updates.audioFile);
      }

      if (updates.videoFile !== undefined) {
        updateFields.push(`video_file = $${paramIndex++}`);
        values.push(updates.videoFile);
      }

      if (updates.thumbnailFile !== undefined) {
        updateFields.push(`thumbnail_file = $${paramIndex++}`);
        values.push(updates.thumbnailFile);
      }

      if (updates.youtubeVideoId !== undefined) {
        updateFields.push(`youtube_video_id = $${paramIndex++}`);
        values.push(updates.youtubeVideoId);
      }

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updates.metadata !== undefined) {
        updateFields.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(updates.metadata));
      }

      if (updateFields.length === 0) {
        return existingVideo;
      }

      values.push(id);

      const query = `
        UPDATE videos 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, project_id, topic, script, audio_file, video_file, thumbnail_file, youtube_video_id, status, metadata, created_at, updated_at
      `;

      const result = await db.query<any>(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to update video');
      }

      const updatedVideo = this.mapDatabaseRowToVideo(result.rows[0]);
      logger.info('Video updated successfully', { videoId: id });
      
      return updatedVideo;
    } catch (error) {
      logger.error('Failed to update video', error as Error, { videoId: id });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM videos WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Video', { id });
      }

      logger.info('Video deleted successfully', { videoId: id });
    } catch (error) {
      logger.error('Failed to delete video', error as Error, { videoId: id });
      throw error;
    }
  }

  async findByStatus(status: VideoStatus): Promise<Video[]> {
    try {
      const query = `
        SELECT id, project_id, topic, script, audio_file, video_file, thumbnail_file, youtube_video_id, status, metadata, created_at, updated_at
        FROM videos 
        WHERE status = $1
        ORDER BY created_at DESC
      `;
      
      const result = await db.query<any>(query, [status]);
      
      return result.rows.map(row => this.mapDatabaseRowToVideo(row));
    } catch (error) {
      logger.error('Failed to find videos by status', error as Error, { status });
      throw new DatabaseError(`Failed to find videos: ${(error as Error).message}`);
    }
  }

  async updateStatus(id: string, status: VideoStatus): Promise<void> {
    try {
      await this.update(id, { status });
      logger.info('Video status updated', { videoId: id, status });
    } catch (error) {
      logger.error('Failed to update video status', error as Error, { videoId: id, status });
      throw error;
    }
  }

  async findPendingVideos(): Promise<Video[]> {
    try {
      const query = `
        SELECT id, project_id, topic, script, audio_file, video_file, thumbnail_file, youtube_video_id, status, metadata, created_at, updated_at
        FROM videos 
        WHERE status IN ('draft', 'script_generating', 'audio_generating', 'visuals_processing', 'video_editing', 'thumbnail_generating')
        ORDER BY created_at ASC
      `;
      
      const result = await db.query<any>(query);
      
      return result.rows.map(row => this.mapDatabaseRowToVideo(row));
    } catch (error) {
      logger.error('Failed to find pending videos', error as Error);
      throw new DatabaseError(`Failed to find pending videos: ${(error as Error).message}`);
    }
  }

  private mapDatabaseRowToVideo(row: any): Video {
    return {
      id: row.id,
      projectId: row.project_id,
      topic: row.topic,
      script: row.script ? (typeof row.script === 'string' ? JSON.parse(row.script) : row.script) : undefined,
      audioFile: row.audio_file,
      videoFile: row.video_file,
      thumbnailFile: row.thumbnail_file,
      youtubeVideoId: row.youtube_video_id,
      status: row.status,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata || {},
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const videoModel = new VideoModel();