const express = require('express');
const router = express.Router();

// Dashboard Status Check
router.get('/api/dashboard/status', (req, res) => {
    res.json({
        success: true,
        data: {
            webServer: 'Running',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date().toISOString()
        }
    });
});

// Video Creation Test
router.post('/api/dashboard/video', (req, res) => {
    const { topic, duration, style } = req.body;
    
    res.json({
        success: true,
        data: {
            videoId: 'papatya-' + Date.now(),
            topic: topic || 'Papatya Bakımı Nasıl Olur - Ev Bahçeciliği Rehberi',
            duration: duration || 480,
            style: style || 'educational',
            steps: [
                '🎯 Analyzing topic and keywords',
                '📝 Generating script with AI',
                '🎙️ Creating voiceover with ElevenLabs',
                '🖼️ Gathering images from Unsplash',
                '🎬 Assembling video with FFmpeg',
                '📺 Preparing for YouTube upload'
            ]
        }
    });
});

// Upload Simulation
router.post('/api/dashboard/upload', (req, res) => {
    const { videoId } = req.body;
    
    res.json({
        success: true,
        data: {
            videoId: videoId || 'papatya-video',
            url: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
            youtubeId: 'dQw4w9WgXcQ',
            status: 'uploaded'
        }
    });
});

// View Videos
router.get('/api/dashboard/videos', (req, res) => {
    res.json({
        success: true,
        data: [
            {
                id: 'papatya-1',
                title: 'Papatya Bakımı - Temel Bilgiler',
                duration: 480,
                status: 'completed',
                createdAt: new Date(Date.now() - 86400000).toISOString()
            },
            {
                id: 'papatya-2',
                title: 'Papatya Çeşitleri ve Özellikleri',
                duration: 360,
                status: 'processing',
                createdAt: new Date(Date.now() - 43200000).toISOString()
            },
            {
                id: 'papatya-3',
                title: 'Papatya Hastalıkları ve Çözümleri',
                duration: 420,
                status: 'uploaded',
                createdAt: new Date().toISOString()
            }
        ]
    });
});

// YouTube Auth Status Check
router.get('/api/dashboard/auth-status', (req, res) => {
    // Simulate checking if user is authenticated
    res.json({
        success: true,
        data: {
            authenticated: true,
            email: 'suatayaz@gmail.com',
            channel: 'Papatya Bahçesi',
            permissions: ['upload', 'manage']
        }
    });
});

module.exports = router;