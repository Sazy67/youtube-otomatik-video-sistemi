import { Project } from '../types';
import { ProjectRepository } from '../types/services';
import { db } from '../database/connection';
import { NotFoundError, DatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

export class ProjectModel implements ProjectRepository {
  async create(projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      const query = `
        INSERT INTO projects (user_id, name, topics, status)
        VALUES ($1, $2, $3, $4)
        RETURNING id, user_id, name, topics, status, created_at, updated_at
      `;
      
      const values = [
        projectData.userId,
        projectData.name,
        projectData.topics,
        projectData.status || 'draft',
      ];

      const result = await db.query<any>(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create project');
      }

      const project = this.mapDatabaseRowToProject(result.rows[0]);
      logger.info('Project created successfully', { 
        projectId: project.id, 
        userId: project.userId,
        name: project.name 
      });
      
      return project;
    } catch (error) {
      logger.error('Failed to create project', error as Error, { 
        userId: projectData.userId,
        name: projectData.name 
      });
      throw error;
    }
  }

  async findById(id: string): Promise<Project | null> {
    try {
      const query = `
        SELECT p.id, p.user_id, p.name, p.topics, p.status, p.created_at, p.updated_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', v.id,
                     'projectId', v.project_id,
                     'topic', v.topic,
                     'script', v.script,
                     'audioFile', v.audio_file,
                     'videoFile', v.video_file,
                     'thumbnailFile', v.thumbnail_file,
                     'youtubeVideoId', v.youtube_video_id,
                     'status', v.status,
                     'metadata', v.metadata,
                     'createdAt', v.created_at,
                     'updatedAt', v.updated_at
                   )
                 ) FILTER (WHERE v.id IS NOT NULL),
                 '[]'
               ) as videos
        FROM projects p
        LEFT JOIN videos v ON p.id = v.project_id
        WHERE p.id = $1
        GROUP BY p.id, p.user_id, p.name, p.topics, p.status, p.created_at, p.updated_at
      `;
      
      const result = await db.query<any>(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToProject(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find project by ID', error as Error, { projectId: id });
      throw new DatabaseError(`Failed to find project: ${(error as Error).message}`);
    }
  }

  async findByUserId(userId: string): Promise<Project[]> {
    try {
      const query = `
        SELECT p.id, p.user_id, p.name, p.topics, p.status, p.created_at, p.updated_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', v.id,
                     'projectId', v.project_id,
                     'topic', v.topic,
                     'script', v.script,
                     'audioFile', v.audio_file,
                     'videoFile', v.video_file,
                     'thumbnailFile', v.thumbnail_file,
                     'youtubeVideoId', v.youtube_video_id,
                     'status', v.status,
                     'metadata', v.metadata,
                     'createdAt', v.created_at,
                     'updatedAt', v.updated_at
                   )
                 ) FILTER (WHERE v.id IS NOT NULL),
                 '[]'
               ) as videos
        FROM projects p
        LEFT JOIN videos v ON p.id = v.project_id
        WHERE p.user_id = $1
        GROUP BY p.id, p.user_id, p.name, p.topics, p.status, p.created_at, p.updated_at
        ORDER BY p.created_at DESC
      `;
      
      const result = await db.query<any>(query, [userId]);
      
      return result.rows.map(row => this.mapDatabaseRowToProject(row));
    } catch (error) {
      logger.error('Failed to find projects by user ID', error as Error, { userId });
      throw new DatabaseError(`Failed to find projects: ${(error as Error).message}`);
    }
  }

  async update(id: string, updates: Partial<Project>): Promise<Project> {
    try {
      const existingProject = await this.findById(id);
      if (!existingProject) {
        throw new NotFoundError('Project', { id });
      }

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        updateFields.push(`name = $${paramIndex++}`);
        values.push(updates.name);
      }

      if (updates.topics !== undefined) {
        updateFields.push(`topics = $${paramIndex++}`);
        values.push(updates.topics);
      }

      if (updates.status !== undefined) {
        updateFields.push(`status = $${paramIndex++}`);
        values.push(updates.status);
      }

      if (updateFields.length === 0) {
        return existingProject;
      }

      values.push(id);

      const query = `
        UPDATE projects 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, user_id, name, topics, status, created_at, updated_at
      `;

      const result = await db.query<any>(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to update project');
      }

      const updatedProject = this.mapDatabaseRowToProject(result.rows[0]);
      logger.info('Project updated successfully', { projectId: id });
      
      return updatedProject;
    } catch (error) {
      logger.error('Failed to update project', error as Error, { projectId: id });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM projects WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('Project', { id });
      }

      logger.info('Project deleted successfully', { projectId: id });
    } catch (error) {
      logger.error('Failed to delete project', error as Error, { projectId: id });
      throw error;
    }
  }

  async findByStatus(status: string): Promise<Project[]> {
    try {
      const query = `
        SELECT p.id, p.user_id, p.name, p.topics, p.status, p.created_at, p.updated_at,
               COALESCE(
                 json_agg(
                   json_build_object(
                     'id', v.id,
                     'projectId', v.project_id,
                     'topic', v.topic,
                     'script', v.script,
                     'audioFile', v.audio_file,
                     'videoFile', v.video_file,
                     'thumbnailFile', v.thumbnail_file,
                     'youtubeVideoId', v.youtube_video_id,
                     'status', v.status,
                     'metadata', v.metadata,
                     'createdAt', v.created_at,
                     'updatedAt', v.updated_at
                   )
                 ) FILTER (WHERE v.id IS NOT NULL),
                 '[]'
               ) as videos
        FROM projects p
        LEFT JOIN videos v ON p.id = v.project_id
        WHERE p.status = $1
        GROUP BY p.id, p.user_id, p.name, p.topics, p.status, p.created_at, p.updated_at
        ORDER BY p.created_at DESC
      `;
      
      const result = await db.query<any>(query, [status]);
      
      return result.rows.map(row => this.mapDatabaseRowToProject(row));
    } catch (error) {
      logger.error('Failed to find projects by status', error as Error, { status });
      throw new DatabaseError(`Failed to find projects: ${(error as Error).message}`);
    }
  }

  private mapDatabaseRowToProject(row: any): Project {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      topics: row.topics || [],
      status: row.status,
      videos: Array.isArray(row.videos) ? row.videos.map((video: any) => ({
        id: video.id,
        projectId: video.projectId,
        topic: video.topic,
        script: video.script,
        audioFile: video.audioFile,
        videoFile: video.videoFile,
        thumbnailFile: video.thumbnailFile,
        youtubeVideoId: video.youtubeVideoId,
        status: video.status,
        metadata: video.metadata || {},
        createdAt: new Date(video.createdAt),
        updatedAt: new Date(video.updatedAt),
      })) : [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const projectModel = new ProjectModel();