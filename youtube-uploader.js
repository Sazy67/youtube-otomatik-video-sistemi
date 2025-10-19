const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

class YouTubeUploader {
    constructor() {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.YOUTUBE_CLIENT_ID,
            process.env.YOUTUBE_CLIENT_SECRET,
            process.env.YOUTUBE_REDIRECT_URI
        );
        
        this.youtube = google.youtube({
            version: 'v3',
            auth: this.oauth2Client
        });
    }

    setCredentials(tokens) {
        this.oauth2Client.setCredentials(tokens);
    }

    async uploadVideo(videoData) {
        console.log('📺 Starting REAL YouTube upload...');
        
        try {
            const { files, metadata, videoId } = videoData;
            
            console.log(`🎬 Uploading: ${metadata.title}`);
            console.log(`📁 Video file: ${files.video}`);
            console.log(`🖼️ Thumbnail: ${files.thumbnail}`);
            
            // Upload video
            const videoResponse = await this.youtube.videos.insert({
                part: ['snippet', 'status'],
                requestBody: {
                    snippet: {
                        title: metadata.title,
                        description: metadata.description,
                        tags: metadata.tags,
                        categoryId: '26', // Howto & Style category
                        defaultLanguage: 'tr',
                        defaultAudioLanguage: 'tr'
                    },
                    status: {
                        privacyStatus: 'public', // or 'private', 'unlisted'
                        selfDeclaredMadeForKids: false
                    }
                },
                media: {
                    body: fs.createReadStream(files.video)
                }
            });

            const uploadedVideoId = videoResponse.data.id;
            console.log(`✅ Video uploaded! YouTube ID: ${uploadedVideoId}`);

            // Upload thumbnail
            if (files.thumbnail && fs.existsSync(files.thumbnail)) {
                try {
                    await this.youtube.thumbnails.set({
                        videoId: uploadedVideoId,
                        media: {
                            body: fs.createReadStream(files.thumbnail)
                        }
                    });
                    console.log('✅ Thumbnail uploaded!');
                } catch (thumbError) {
                    console.log('⚠️ Thumbnail upload failed:', thumbError.message);
                }
            }

            const result = {
                success: true,
                youtubeId: uploadedVideoId,
                url: `https://www.youtube.com/watch?v=${uploadedVideoId}`,
                title: metadata.title,
                uploadTime: new Date().toISOString(),
                channel: 'Yeşil Hayat Rotası'
            };

            console.log('🎉 REAL YouTube upload completed!');
            console.log(`🔗 Video URL: ${result.url}`);
            
            return result;

        } catch (error) {
            console.error('❌ YouTube upload error:', error.message);
            
            if (error.code === 401) {
                throw new Error('YouTube authentication required. Please complete OAuth first.');
            }
            
            if (error.code === 403) {
                throw new Error('YouTube API quota exceeded or insufficient permissions.');
            }
            
            throw error;
        }
    }

    async getChannelInfo() {
        try {
            const response = await this.youtube.channels.list({
                part: ['snippet', 'statistics'],
                mine: true
            });

            if (response.data.items && response.data.items.length > 0) {
                const channel = response.data.items[0];
                return {
                    id: channel.id,
                    title: channel.snippet.title,
                    description: channel.snippet.description,
                    subscriberCount: channel.statistics.subscriberCount,
                    videoCount: channel.statistics.videoCount,
                    viewCount: channel.statistics.viewCount
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ Channel info error:', error.message);
            return null;
        }
    }

    async listVideos(maxResults = 10) {
        try {
            const response = await this.youtube.search.list({
                part: ['snippet'],
                forMine: true,
                type: 'video',
                maxResults: maxResults,
                order: 'date'
            });

            return response.data.items.map(item => ({
                id: item.id.videoId,
                title: item.snippet.title,
                description: item.snippet.description,
                publishedAt: item.snippet.publishedAt,
                thumbnails: item.snippet.thumbnails
            }));
        } catch (error) {
            console.error('❌ List videos error:', error.message);
            return [];
        }
    }
}

module.exports = YouTubeUploader;