import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { projectModel } from '../models/Project';
import { ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/projects - List user projects
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const projects = await projectModel.findByUserId(userId);
    
    res.json({
      success: true,
      data: projects,
    });
  } catch (error) {
    logger.error('Failed to get projects', error as Error, { userId: req.user?.userId });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve projects',
    });
  }
});

// POST /api/projects - Create new project
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { name, topics } = req.body;
    
    if (!name || !topics || !Array.isArray(topics)) {
      throw new ValidationError('Name and topics array are required');
    }
    
    const project = await projectModel.create({
      userId,
      name,
      topics,
      status: 'draft',
      videos: [],
    });
    
    res.status(201).json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Failed to create project', error as Error, { userId: req.user?.userId });
    
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
        message: 'Failed to create project',
      });
    }
  }
});

// GET /api/projects/:id - Get project details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const project = await projectModel.findById(id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Project not found',
      });
    }
    
    // Check ownership
    if (project.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this project',
      });
    }
    
    res.json({
      success: true,
      data: project,
    });
  } catch (error) {
    logger.error('Failed to get project', error as Error, { projectId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to retrieve project',
    });
  }
});

// PUT /api/projects/:id - Update project
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const project = await projectModel.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Project not found',
      });
    }
    
    // Check ownership
    if (project.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this project',
      });
    }
    
    const updatedProject = await projectModel.update(id, updates);
    
    res.json({
      success: true,
      data: updatedProject,
    });
  } catch (error) {
    logger.error('Failed to update project', error as Error, { projectId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to update project',
    });
  }
});

// DELETE /api/projects/:id - Delete project
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const project = await projectModel.findById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Not found',
        message: 'Project not found',
      });
    }
    
    // Check ownership
    if (project.userId !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'You do not have access to this project',
      });
    }
    
    await projectModel.delete(id);
    
    res.json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete project', error as Error, { projectId: req.params.id });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: 'Failed to delete project',
    });
  }
});

export default router;