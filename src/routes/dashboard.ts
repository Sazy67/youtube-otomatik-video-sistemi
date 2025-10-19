import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';

const router = Router();

// Dashboard API endpoints for testing

// GET /api/dashboard/status - System status
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      webServer: 'ACTIVE',
      apiGateway: 'READY', 
      database: 'MOCK MODE',
      queue: 'MEMORY MODE',
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  });
});

// POST /api/dashboard/video - Create video simulation
router.post('/video', (req: Request, res: Response) => {
  const { topic, duration, style } = req.body;
  
  logger.info('Dashboard video creation request', { topic, duration, style });
  
  res.json({
    success: true,
    data: {
      videoId: 'papatya-' + Date.now(),
      topic: topic || 'Papatya Bakımı Nasıl Olur',
      duration: duration || 480,
      style: style || 'educational',
      status: 'processing',
      steps: [
        'Generating AI script...',
        'Converting to speech...',
        'Finding visual content...',
        'Creating video montage...',
        'Generating thumbnail...',
        'Preparing for upload...'
      ]
    }
  });
});

// POST /api/dashboard/upload - Simulate upload
router.post('/upload', (req: Request, res: Response) => {
  const { videoId } = req.body;
  
  logger.info('Dashboard upload simulation', { videoId });
  
  res.json({
    success: true,
    data: {
      videoId: videoId || 'papatya-video',
      youtubeId: 'dQw4w9WgXcQ',
      status: 'uploaded',
      url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
      title: 'Papatya Bakımı Nasıl Olur - Ev Bahçeciliği Rehberi',
      views: 0,
      uploadTime: new Date().toISOString()
    }
  });
});

// GET /api/dashboard/videos - List videos
router.get('/videos', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: [
      {
        id: 'papatya-1',
        title: 'Papatya Bakımı Nasıl Olur - Ev Bahçeciliği Rehberi',
        duration: 480,
        status: 'ready',
        thumbnail: '/placeholder-thumbnail.jpg',
        createdAt: new Date().toISOString()
      }
    ]
  });
});

export default router;