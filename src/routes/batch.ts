import { Router, Request, Response } from 'express';
import { authenticateToken, requireYouTubeAccess } from '../middleware/auth';
import { projectModel } from '../models/Project';
import { taskQueueService } from '../services/TaskQueueService';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// POST /api/batch - Start batch video generation
router.post('/', requireYouTubeAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { topics, projectName, duration = 600 } = req.body;
    
    if (!topics || !Array.isArray(topics) || topics.length === 0) {
      throw new ValidationError('Topics array is required and must not be empty');
    }
    
    if (topics.length > 10) {
      throw new ValidationError('Maximum 10 topics allowed per batch');
    }
    
    // Create project for batch
    const project = await projectModel.create({
      userId,
      name: projectName || `Batch ${new Date().toISOString().split('T')[0]}`,
      topics,
      status: 'processing',
      videos: [],
    });
    
    // Add tasks to queue
    const taskIds: string[] = [];
    
    for (const topic of topics) {
      const taskId = await taskQueueService.addTask({
        id: uuidv4(),
        userId,
        topic,
        status: 'pending',
        progress: 0,
        createdAt: new Date(),
      });
      
      taskIds.push(taskId);
    }
    
    res.status(201).json({
      success: true,
      data: {
        project,
        taskIds,
        message: `Batch processing started for ${topics.length} videos`,
      },
    });
  } catch (error) {
    logger.error('Failed to start batch processing', error as Error, { userId: req.user?.userId });
    
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'Failed to start batch processing',
      });
    }
  }
});

// GET /api/batch/:id - Get batch status
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await projectModel.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Batch not found',
      });
    }
    
    // Check ownership
    if (project.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this batch',
      });
    }
    
    // Get queue statistics
    const queueStats = await taskQueueService.getQueueStats();
    
    res.json({
      success: true,
      data: {
        project,
        queueStats,
      },
    });
  } catch (error) {
    logger.error('Failed to get batch status', error as Error, { batchId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get batch status',
    });
  }
});

export default router;