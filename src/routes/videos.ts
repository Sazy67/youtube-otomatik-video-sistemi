import { Router, Request, Response } from 'express';
import { authenticateToken, requireYouTubeAccess } from '../middleware/auth';
import { videoModel } from '../models/Video';
import { taskQueueService } from '../services/TaskQueueService';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// POST /api/videos - Create new video from topic
router.post('/', requireYouTubeAccess, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { topic, projectId, duration = 600 } = req.body;
    
    if (!topic) {
      throw new ValidationError('Topic is required');
    }
    
    // Create video record
    const video = await videoModel.create({
      projectId: projectId || null,
      topic,
      status: 'draft',
      metadata: {
        title: topic,
        description: '',
        tags: [],
        category: '27',
        privacy: 'private',
      },
    });
    
    // Add to processing queue
    const taskId = await taskQueueService.addTask({
      id: uuidv4(),
      userId,
      topic,
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
    });
    
    res.status(201).json({
      success: true,
      data: {
        video,
        taskId,
        message: 'Video creation started',
      },
    });
  } catch (error) {
    logger.error('Failed to create video', error as Error, { userId: req.user?.userId });
    
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
        message: 'Failed to create video',
      });
    }
  }
});

// GET /api/videos/:id - Get video details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const video = await videoModel.findById(id);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Video not found',
      });
    }
    
    res.json({
      success: true,
      data: video,
    });
  } catch (error) {
    logger.error('Failed to get video', error as Error, { videoId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve video',
    });
  }
});

// GET /api/videos/:id/status - Get video processing status
router.get('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { taskId } = req.query;
    
    if (taskId) {
      const status = await taskQueueService.getTaskStatus(taskId as string);
      res.json({
        success: true,
        data: { status, taskId },
      });
    } else {
      const video = await videoModel.findById(id);
      if (!video) {
        return res.status(404).json({
          success: false,
          error: 'Not found',
          message: 'Video not found',
        });
      }
      
      res.json({
        success: true,
        data: { status: video.status, videoId: id },
      });
    }
  } catch (error) {
    logger.error('Failed to get video status', error as Error, { videoId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to get video status',
    });
  }
});

// DELETE /api/videos/:id - Delete video
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const video = await videoModel.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Video not found',
      });
    }
    
    await videoModel.delete(id);
    
    res.json({
      success: true,
      message: 'Video deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete video', error as Error, { videoId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete video',
    });
  }
});

export default router;