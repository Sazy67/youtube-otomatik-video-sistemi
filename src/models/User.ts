import { User, UserPreferences } from '../types';
import { UserRepository } from '../types/services';
import { db } from '../database/connection';
import { NotFoundError, DatabaseError } from '../utils/errors';
import { logger } from '../utils/logger';

export class UserModel implements UserRepository {
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    try {
      const query = `
        INSERT INTO users (email, youtube_channel_id, access_token, refresh_token, preferences)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, email, youtube_channel_id, access_token, refresh_token, preferences, created_at, updated_at
      `;
      
      const values = [
        userData.email,
        userData.youtubeChannelId || null,
        userData.accessToken || null,
        userData.refreshToken || null,
        JSON.stringify(userData.preferences),
      ];

      const result = await db.query(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to create user');
      }

      const user = this.mapDatabaseRowToUser(result.rows[0]);
      logger.info('User created successfully', { userId: user.id, email: user.email });
      
      return user;
    } catch (error) {
      logger.error('Failed to create user', error as Error, { email: userData.email });
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, youtube_channel_id, access_token, refresh_token, preferences, created_at, updated_at
        FROM users 
        WHERE id = $1
      `;
      
      const result = await db.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find user by ID', error as Error, { userId: id });
      throw new DatabaseError(`Failed to find user: ${(error as Error).message}`);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, youtube_channel_id, access_token, refresh_token, preferences, created_at, updated_at
        FROM users 
        WHERE email = $1
      `;
      
      const result = await db.query<any>(query, [email]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find user by email', error as Error, { email });
      throw new DatabaseError(`Failed to find user: ${(error as Error).message}`);
    }
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    try {
      const existingUser = await this.findById(id);
      if (!existingUser) {
        throw new NotFoundError('User', { id });
      }

      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }

      if (updates.youtubeChannelId !== undefined) {
        updateFields.push(`youtube_channel_id = $${paramIndex++}`);
        values.push(updates.youtubeChannelId);
      }

      if (updates.accessToken !== undefined) {
        updateFields.push(`access_token = $${paramIndex++}`);
        values.push(updates.accessToken);
      }

      if (updates.refreshToken !== undefined) {
        updateFields.push(`refresh_token = $${paramIndex++}`);
        values.push(updates.refreshToken);
      }

      if (updates.preferences !== undefined) {
        updateFields.push(`preferences = $${paramIndex++}`);
        values.push(JSON.stringify(updates.preferences));
      }

      if (updateFields.length === 0) {
        return existingUser;
      }

      values.push(id);

      const query = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, email, youtube_channel_id, access_token, refresh_token, preferences, created_at, updated_at
      `;

      const result = await db.query<any>(query, values);
      
      if (result.rows.length === 0) {
        throw new DatabaseError('Failed to update user');
      }

      const updatedUser = this.mapDatabaseRowToUser(result.rows[0]);
      logger.info('User updated successfully', { userId: id });
      
      return updatedUser;
    } catch (error) {
      logger.error('Failed to update user', error as Error, { userId: id });
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const query = 'DELETE FROM users WHERE id = $1';
      const result = await db.query(query, [id]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError('User', { id });
      }

      logger.info('User deleted successfully', { userId: id });
    } catch (error) {
      logger.error('Failed to delete user', error as Error, { userId: id });
      throw error;
    }
  }

  async findByYouTubeChannelId(channelId: string): Promise<User | null> {
    try {
      const query = `
        SELECT id, email, youtube_channel_id, access_token, refresh_token, preferences, created_at, updated_at
        FROM users 
        WHERE youtube_channel_id = $1
      `;
      
      const result = await db.query<any>(query, [channelId]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToUser(result.rows[0]);
    } catch (error) {
      logger.error('Failed to find user by YouTube channel ID', error as Error, { channelId });
      throw new DatabaseError(`Failed to find user: ${(error as Error).message}`);
    }
  }

  async updateTokens(id: string, accessToken: string, refreshToken?: string): Promise<void> {
    try {
      const updates: Partial<User> = { accessToken };
      if (refreshToken) {
        updates.refreshToken = refreshToken;
      }
      
      await this.update(id, updates);
      logger.info('User tokens updated successfully', { userId: id });
    } catch (error) {
      logger.error('Failed to update user tokens', error as Error, { userId: id });
      throw error;
    }
  }

  private mapDatabaseRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      youtubeChannelId: row.youtube_channel_id,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      preferences: typeof row.preferences === 'string' 
        ? JSON.parse(row.preferences) 
        : row.preferences || this.getDefaultPreferences(),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private getDefaultPreferences(): UserPreferences {
    return {
      defaultVoice: 'pNInz6obpgDQGcFmaJgB',
      defaultCategory: '27', // Education category
      defaultPrivacy: 'private',
      videoStyle: 'educational',
      thumbnailStyle: 'professional',
    };
  }
}

export const userModel = new UserModel();