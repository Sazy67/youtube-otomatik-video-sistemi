const express = require('express');
const path = require('path');
const dashboardApi = require('./dashboard-api');
const RealVideoCreator = require('./real-video-creator-fixed');
const YouTubeUploader = require('./youtube-uploader');
const OAuthTokenManager = require('./oauth-token-manager');

const app = express();
const port = 3001;

// Initialize real video creator and uploader
const videoCreator = new RealVideoCreator();
const youtubeUploader = new YouTubeUploader();
const tokenManager = new OAuthTokenManager();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Dashboard API routes
app.use(dashboardApi);

// REAL Video Creation Endpoint
app.post('/api/dashboard/real-video', async (req, res) => {
    const { topic, duration, style } = req.body;
    
    console.log(`🎬 REAL video creation request: ${topic}`);
    
    try {
        // Create real video
        const videoData = await videoCreator.createVideo(topic, duration, style);
        
        res.json({
            success: true,
            data: {
                videoId: videoData.videoId,
                topic: videoData.topic,
                duration: videoData.duration,
                status: 'completed',
                files: {
                    video: videoData.files.video,
                    thumbnail: videoData.files.thumbnail
                },
                metadata: videoData.metadata,
                message: 'Real video created successfully! Ready for YouTube upload.'
            }
        });
        
    } catch (error) {
        console.error('❌ Real video creation failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Video Creation Failed',
            message: error.message
        });
    }
});

// REAL YouTube Upload Endpoint
app.post('/api/dashboard/real-upload', async (req, res) => {
    const { videoId, videoData } = req.body;
    
    console.log(`📺 REAL YouTube upload request: ${videoId}`);
    
    try {
        // Load saved tokens
        const tokens = tokenManager.loadTokens();
        if (!tokens) {
            throw new Error('No OAuth tokens found. Please complete YouTube OAuth first.');
        }
        
        // Set credentials for uploader
        youtubeUploader.setCredentials(tokens);
        
        // Upload to YouTube
        const uploadResult = await youtubeUploader.uploadVideo(videoData);
        
        res.json({
            success: true,
            data: {
                youtubeId: uploadResult.youtubeId,
                url: uploadResult.url,
                title: uploadResult.title,
                channel: uploadResult.channel,
                uploadTime: uploadResult.uploadTime,
                message: 'Video successfully uploaded to YouTube!'
            }
        });
        
    } catch (error) {
        console.error('❌ Upload simulation failed:', error.message);
        res.status(500).json({
            success: false,
            error: 'Upload Simulation Failed',
            message: error.message
        });
    }
});

// OAuth routes (simplified)
app.get('/auth/youtube', (req, res) => {
    const { email } = req.query;

    // Generate OAuth URL
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:3001/auth/youtube/callback';

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=https://www.googleapis.com/auth/youtube.upload&` +
        `access_type=offline&` +
        `prompt=consent&` +
        `state=${email || 'test'}`;

    res.json({
        success: true,
        data: {
            authUrl: authUrl,
            email: email
        }
    });
});

// Auth status check endpoint
app.get('/auth/me', (req, res) => {
    // Simulate checking if user is authenticated
    res.json({
        success: true,
        data: {
            authenticated: true,
            email: 'suatayaz@gmail.com',
            channel: 'Yeşil Hayat Rotası',
            channelId: 'UC_mock_channel_id_here',
            permissions: ['upload', 'manage', 'read'],
            accessToken: 'ya29.mock_token_here',
            refreshToken: 'refresh_token_here',
            uploadTarget: 'Yeşil Hayat Rotası YouTube Kanalı'
        }
    });
});

// OAuth callback
app.get('/auth/youtube/callback', async (req, res) => {
    const { code, state } = req.query;

    if (code) {
        try {
            // Exchange code for tokens
            const { google } = require('googleapis');
            const oauth2Client = new google.auth.OAuth2(
                process.env.YOUTUBE_CLIENT_ID,
                process.env.YOUTUBE_CLIENT_SECRET,
                process.env.YOUTUBE_REDIRECT_URI
            );
            
            const { tokens } = await oauth2Client.getToken(code);
            
            // Save tokens
            tokenManager.saveTokens(tokens);
            
            // Set credentials for uploader
            youtubeUploader.setCredentials(tokens);
            
            res.send(`
                <html>
                    <head><title>OAuth Success</title></head>
                    <body style="font-family: Arial; text-align: center; padding: 50px;">
                        <h1>🎉 YouTube OAuth Başarılı!</h1>
                        <p>✅ Token'lar kaydedildi - Upload hazır!</p>
                        <p>📧 Email: ${state}</p>
                        <p>🔄 Artık gerçek YouTube upload yapabilirsiniz!</p>
                        <p><strong>Dashboard'a dönebilirsiniz!</strong></p>
                        <script>
                            setTimeout(() => {
                                window.close();
                            }, 3000);
                        </script>
                    </body>
                </html>
            `);
        } catch (error) {
            console.error('❌ Token exchange failed:', error.message);
            res.send(`
                <html>
                    <head><title>OAuth Error</title></head>
                    <body style="font-family: Arial; text-align: center; padding: 50px;">
                        <h1>❌ OAuth Hatası</h1>
                        <p>Token exchange başarısız: ${error.message}</p>
                        <p>Lütfen tekrar deneyin</p>
                    </body>
                </html>
            `);
        }
    } else {
        res.send(`
            <html>
                <head><title>OAuth Error</title></head>
                <body style="font-family: Arial; text-align: center; padding: 50px;">
                    <h1>❌ OAuth Hatası</h1>
                    <p>Authorization code alınamadı</p>
                    <p>Lütfen tekrar deneyin</p>
                </body>
            </html>
        `);
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'YouTube Automation Dashboard is running!',
        version: '1.0.0'
    });
});

// Default route
app.get('/', (req, res) => {
    res.redirect('/dashboard');
});

// Dashboard route
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'The requested resource was not found'
    });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 YouTube Automation Dashboard running at http://localhost:${port}`);
    console.log(`📊 Dashboard: http://localhost:${port}/dashboard`);
    console.log(`💚 Health check: http://localhost:${port}/health`);
    console.log('✅ All API endpoints ready!');
});

module.exports = app;