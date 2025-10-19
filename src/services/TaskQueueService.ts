import { TaskQueueManager } from '../types/services';
import { VideoProductionTask, TaskStatus } from '../types';
import { logger } from '../utils/logger';
import { QueueError } from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export class TaskQueueService implements TaskQueueManager {
  private tasks: Map<string, any> = new Map();

  constructor() {
    logger.info('TaskQueueService initialized in memory mode');
  }

  async addTask(task: VideoProductionTask): Promise<string> {
    try {
      const taskId = task.id || uuidv4();
      
      logger.info('Adding task to memory queue', { taskId, userId: task.userId, topic: task.topic });

      this.tasks.set(taskId, { ...task, id: taskId, status: 'pending' });
      
      // Process immediately in development mode
      setTimeout(() => this.processTask(taskId), 1000);
      
      logger.info('Task added to memory queue successfully', { taskId });
      return taskId;
    } catch (error) {
      logger.error('Failed to add task to queue', error as Error, { task });
      throw new QueueError(`Failed to add task: ${(error as Error).message}`);
    }
  }

  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    try {
      const task = this.tasks.get(taskId);
      
      if (!task) {
        throw new QueueError('Task not found');
      }

      return task.status as TaskStatus;
    } catch (error) {
      logger.error('Failed to get task status', error as Error, { taskId });
      throw new QueueError(`Failed to get task status: ${(error as Error).message}`);
    }
  }

  async processQueue(): Promise<void> {
    logger.info('Processing queue in memory mode');
  }

  async retryFailedTasks(): Promise<void> {
    logger.info('Retry functionality available in memory mode');
  }

  private async processTask(taskId: string): Promise<void> {
    try {
      const task = this.tasks.get(taskId);
      if (!task) return;

      logger.info('Processing video task in memory mode', { taskId: task.id, topic: task.topic });
      
      // Update status to processing
      task.status = 'processing';
      this.tasks.set(taskId, task);

      // Simulate processing steps
      await this.simulateVideoProcessing(taskId);
      
      // Mark as completed
      task.status = 'completed';
      this.tasks.set(taskId, task);

      logger.info('Video task completed successfully', { taskId: task.id });
    } catch (error) {
      logger.error('Video task processing failed', error as Error, { taskId });
      const task = this.tasks.get(taskId);
      if (task) {
        task.status = 'failed';
        task.error = (error as Error).message;
        this.tasks.set(taskId, task);
      }
    }
  }

  private async simulateVideoProcessing(taskId: string): Promise<void> {
    const steps = [
      'Generating script...',
      'Converting to speech...',
      'Finding visual content...',
      'Creating video...',
      'Generating thumbnail...',
      'Preparing for upload...'
    ];

    for (let i = 0; i < steps.length; i++) {
      logger.info(steps[i], { taskId });
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay per step
    }
  }



  async getQueueStats(): Promise<any> {
    const tasks = Array.from(this.tasks.values());
    
    return {
      waiting: tasks.filter(t => t.status === 'pending').length,
      active: tasks.filter(t => t.status === 'processing').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  }

  async cleanup(): Promise<void> {
    this.tasks.clear();
    logger.info('TaskQueueService cleaned up');
  }
}

export const taskQueueService = new TaskQueueService();