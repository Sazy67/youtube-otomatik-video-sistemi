import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';
import { logger } from '../utils/logger';
import { DatabaseError } from '../utils/errors';

export class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.username,
      password: config.database.password,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      const client = await this.pool.connect();
      logger.info('Database connected successfully');
      client.release();
    } catch (error) {
      logger.error('Failed to connect to database', error as Error);
      throw new DatabaseError('Failed to connect to database');
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.pool.end();
      logger.info('Database disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from database', error as Error);
      throw new DatabaseError('Failed to disconnect from database');
    }
  }

  public async query(text: string, params?: any[]): Promise<any> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;
      
      logger.debug('Executed query', {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount,
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error('Query execution failed', error as Error, {
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        params,
        duration: `${duration}ms`,
      });
      throw new DatabaseError(`Query execution failed: ${(error as Error).message}`);
    }
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Transaction failed, rolled back', error as Error);
      throw error;
    } finally {
      client.release();
    }
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public get poolInfo() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }
}

export const db = DatabaseConnection.getInstance();