const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { GoogleGenerativeAI } = require('@google/generative-ai');
// Only ElevenLabs TTS

const execAsync = promisify(exec);

class RealVideoCreator {
    constructor() {
        // Load environment variables
        require('dotenv').config();
        
        this.openaiApiKey = process.env.OPENAI_API_KEY;
        this.elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
        this.elevenlabsVoiceId = process.env.ELEVENLABS_VOICE_ID;
        this.unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
        this.geminiApiKey = process.env.GEMINI_API_KEY;
        
        // Initialize Gemini
        if (this.geminiApiKey && this.geminiApiKey !== 'your-gemini-api-key-here') {
            this.genAI = new GoogleGenerativeAI(this.geminiApiKey);
            this.geminiModel = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        }
        

        
        // Only ElevenLabs TTS - no fallbacks
        
        // Debug API keys
        console.log('🔑 Services loaded:');
        console.log('   OpenAI:', this.openaiApiKey ? '✅ Set' : '❌ Missing');
        console.log('   Gemini:', this.geminiApiKey && this.geminiApiKey !== 'your-gemini-api-key-here' ? '✅ Set' : '❌ Missing');
        console.log('   ElevenLabs:', this.elevenlabsApiKey && this.elevenlabsApiKey !== 'your-elevenlabs-api-key-here' ? '✅ ONLY TTS' : '❌ Missing');
        console.log('   Unsplash:', this.unsplashAccessKey ? '✅ Set' : '❌ Missing');
        
        // Create necessary directories
        this.ensureDirectories();
    }

    ensureDirectories() {
        const dirs = ['./temp', './uploads', './videos', './audio', './images'];
        dirs.forEach(dir => {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    }

    async createVideo(topic, duration = 480, style = 'educational') {
        console.log(`🎬 Starting REAL video creation for: "${topic}"`);
        
        const videoId = `video_${Date.now()}`;
        
        try {
            // Step 1: Generate AI Script
            console.log('📝 Step 1/6: Generating AI script...');
            const script = await this.generateScript(topic, duration, style);
            
            // Step 2: Create Audio
            console.log('🎤 Step 2/6: Creating voiceover...');
            const audioFile = await this.createAudio(script, videoId);
            
            // Step 3: Gather Images
            console.log('🖼️ Step 3/6: Gathering images...');
            const images = await this.gatherImages(topic);
            
            // Step 4: Create Video
            console.log('🎞️ Step 4/6: Creating video...');
            const videoFile = await this.assembleVideo(audioFile, images, videoId, duration);
            
            // Step 5: Create Thumbnail
            console.log('🖼️ Step 5/6: Creating thumbnail...');
            const thumbnail = await this.createThumbnail(topic, images[0]);
            
            // Step 6: Prepare for Upload
            console.log('📺 Step 6/6: Preparing upload...');
            
            const result = {
                videoId: videoId,
                topic: topic,
                duration: duration,
                style: style,
                files: {
                    video: videoFile,
                    audio: audioFile,
                    thumbnail: thumbnail,
                    script: script
                },
                metadata: {
                    title: this.generateTitle(topic),
                    description: this.generateDescription(topic),
                    tags: this.generateTags(topic),
                    category: 'Education'
                },
                status: 'ready_for_upload'
            };

            console.log('✅ REAL video creation completed!');
            return result;

        } catch (error) {
            console.error('❌ Real video creation failed:', error.message);
            throw error;
        }
    }

    async generateScript(topic, duration, style) {
        console.log('🧠 Generating AI script...');
        
        const prompt = `Create a detailed, engaging Turkish script for a ${duration/60}-minute YouTube video about "${topic}".

Style: ${style}
Target audience: Turkish viewers interested in gardening and nature
Channel: "Yeşil Hayat Rotası"

Requirements:
- Write in natural, conversational Turkish
- Include practical tips and advice
- Make it educational and engaging
- Structure with clear sections
- Add emotional connection to nature
- Include call-to-action at the end
- Optimize for ${duration} seconds of speech

Please write a complete script that would take approximately ${duration} seconds to read aloud.`;

        // Try Gemini first
        if (this.geminiModel) {
            try {
                console.log('🤖 Using Google Gemini Pro...');
                const result = await this.geminiModel.generateContent(prompt);
                const response = await result.response;
                const script = response.text();
                
                const scriptFile = `./temp/script_${Date.now()}.txt`;
                fs.writeFileSync(scriptFile, script, 'utf8');
                
                console.log(`✅ Gemini script generated: ${script.length} characters`);
                return script;

            } catch (error) {
                console.error('❌ Gemini API error:', error.message);
            }
        }

        // Fallback script
        const fallbackScript = `Merhaba değerli Yeşil Hayat Rotası izleyicileri! Ben bugün sizlerle ${topic} konusunu detaylıca ele alacağım.

${topic}, bahçe tutkunları ve doğa severlerin en çok merak ettiği konulardan biri. Bu videoda size pratik bilgiler ve deneyimli bahçıvanların püf noktalarını paylaşacağım.

${topic} konusunda başarılı olmak için dikkat etmeniz gereken temel noktalar şunlar:

Birincisi, doğru zamanlama çok önemlidir. Her bitkinin kendine özgü bir takvimi vardır ve bu takvime uygun hareket etmek gerekir.

İkincisi, toprak hazırlığı başarının temelidir. Kaliteli toprak, sağlıklı bitkilerin en önemli şartıdır. Organik gübre kullanımını ihmal etmeyin.

Üçüncüsü, sulama tekniği kritik öneme sahiptir. Ne çok su ne de az su vermeyin. Bitkinin ihtiyacını gözlemleyerek sulama yapın.

Bu konuda daha detaylı bilgi almak istiyorsanız, kanalımıza abone olmayı unutmayın. Yeşil Hayat Rotası'nda doğayla uyum içinde yaşamanın sırlarını birlikte keşfediyoruz.

Bir sonraki videomuzda görüşmek üzere, herkese sağlıklı ve bereketli günler dilerim!`;

        console.log('⚠️ Using fallback script');
        return fallbackScript;
    }

    async createAudio(script, videoId) {
        console.log('🎤 Creating Turkish voiceover with ElevenLabs ONLY...');
        
        // Only use ElevenLabs - no fallbacks
        if (!this.elevenlabsApiKey || this.elevenlabsApiKey === 'your-elevenlabs-api-key-here') {
            throw new Error('ElevenLabs API key not configured');
        }
        
        console.log('🔄 Using ElevenLabs for Turkish voice...');
        console.log('📝 Script length:', script.length, 'characters');
        console.log('🔑 API Key:', this.elevenlabsApiKey.substring(0, 10) + '...');
        
        const response = await axios.post(`https://api.elevenlabs.io/v1/text-to-speech/${this.elevenlabsVoiceId}`, {
            text: script,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                style: 0.0,
                use_speaker_boost: true
            }
        }, {
            headers: {
                'Accept': 'audio/mpeg',
                'Content-Type': 'application/json',
                'xi-api-key': this.elevenlabsApiKey
            },
            responseType: 'arraybuffer'
        });

        const mp3File = `./audio/audio_${videoId}.mp3`;
        fs.writeFileSync(mp3File, response.data);
        
        const stats = fs.statSync(mp3File);
        console.log(`✅ ElevenLabs Turkish voice created: ${mp3File}`);
        console.log(`📊 Audio file size: ${Math.round(stats.size / 1024)}KB`);
        
        return mp3File;
    }

    async gatherImages(topic) {
        console.log('🖼️ Gathering images from Unsplash...');
        
        const images = [];
        const searchTerms = this.generateImageSearchTerms(topic);
        
        // Try to download real images from Unsplash
        for (const term of searchTerms.slice(0, 12)) {
            if (images.length >= 15) break;
            
            try {
                console.log(`🔍 Searching for: ${term}`);
                
                const response = await axios.get('https://api.unsplash.com/search/photos', {
                    params: {
                        query: term,
                        per_page: 5,
                        orientation: 'landscape'
                    },
                    headers: {
                        'Authorization': `Client-ID ${this.unsplashAccessKey}`
                    },
                    timeout: 10000
                });

                console.log(`📊 Found ${response.data.results.length} images for: ${term}`);

                if (response.data.results.length > 0) {
                    for (const photo of response.data.results) {
                        if (images.length >= 15) break;
                        
                        try {
                            const imageUrl = photo.urls.regular;
                            console.log(`📥 Downloading: ${imageUrl.substring(0, 50)}...`);
                            
                            const imageResponse = await axios.get(imageUrl, { 
                                responseType: 'arraybuffer',
                                timeout: 15000
                            });
                            
                            const imagePath = `./images/unsplash_${Date.now()}_${Math.random().toString(36).substring(2, 11)}.jpg`;
                            fs.writeFileSync(imagePath, imageResponse.data);
                            
                            const stats = fs.statSync(imagePath);
                            if (stats.size > 5000) { // At least 5KB
                                images.push(imagePath);
                                console.log(`✅ Downloaded: ${term} -> ${imagePath} (${Math.round(stats.size/1024)}KB)`);
                            } else {
                                console.log(`⚠️ File too small, deleting: ${imagePath}`);
                                fs.unlinkSync(imagePath);
                            }
                            
                        } catch (downloadErr) {
                            console.log(`⚠️ Download failed: ${downloadErr.message}`);
                        }
                    }
                }
            } catch (err) {
                console.log(`⚠️ Search failed for: ${term} - ${err.message}`);
            }
        }
        
        // If no images downloaded, use sample images as fallback
        if (images.length === 0) {
            console.log('📸 Using sample garden images as fallback...');
            for (let i = 1; i <= 15; i++) {
                const samplePath = `./images/sample_${i}.jpg`;
                if (fs.existsSync(samplePath)) {
                    images.push(samplePath);
                    console.log(`✅ Using sample image: ${samplePath}`);
                }
            }
        }
        
        // If still no images, create colorful placeholders
        if (images.length === 0) {
            console.log('⚠️ Creating 15 placeholder images...');
            const colors = ['forestgreen', 'lightgreen', 'darkgreen', 'olive', 'limegreen', 'seagreen', 'mediumseagreen', 'springgreen', 'palegreen', 'lightseagreen', 'darkseagreen', 'green', 'lime', 'chartreuse', 'greenyellow'];
            
            for (let i = 0; i < 15; i++) {
                const placeholderPath = `./images/placeholder_${Date.now()}_${i}.jpg`;
                const color = colors[i % colors.length];
                
                await execAsync(`ffmpeg -f lavfi -i "color=c=${color}:size=1920x1080:duration=1" -frames:v 1 "${placeholderPath}" -y`);
                
                if (fs.existsSync(placeholderPath)) {
                    images.push(placeholderPath);
                    console.log(`✅ Created ${color} placeholder: ${placeholderPath}`);
                }
            }
        }

        console.log(`✅ Gathered ${images.length} images`);
        return images;
    }

    generateImageSearchTerms(topic) {
        // Base gardening terms
        const baseTerms = ['garden', 'nature', 'plant', 'flower', 'gardening'];
        
        // Extract words from topic
        const topicWords = topic.toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove special characters
            .split(/\s+/)
            .filter(word => word.length > 2); // Only words longer than 2 chars
        
        // Combine and return unique terms
        const allTerms = [...baseTerms, ...topicWords, 'botanical', 'green', 'organic'];
        return [...new Set(allTerms)]; // Remove duplicates
    }

    async assembleVideo(audioFile, images, videoId, duration) {
        console.log('🎞️ Assembling video with FFmpeg...');
        console.log(`📊 Using ${images.length} images for ${duration}s video`);
        
        try {
            const videoFile = `./videos/video_${videoId}.mp4`;
            
            // Check if audio file exists and has content
            if (!fs.existsSync(audioFile)) {
                throw new Error(`Audio file not found: ${audioFile}`);
            }
            
            const audioStats = fs.statSync(audioFile);
            console.log(`🎵 Audio file size: ${Math.round(audioStats.size / 1024)}KB`);
            
            if (images.length === 1) {
                // Single image with audio
                const image = images[0];
                console.log(`🔄 Creating video with single image: ${image}`);
                
                const ffmpegCommand = `ffmpeg -loop 1 -i "${image}" -i "${audioFile}" -c:v libx264 -c:a aac -b:a 192k -ar 48000 -shortest -pix_fmt yuv420p -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" "${videoFile}" -y`;
                
                await execAsync(ffmpegCommand);
                
            } else {
                // Multiple images slideshow with audio - Simple approach
                console.log(`🔄 Creating slideshow with ${images.length} images and audio...`);
                
                const imageDuration = Math.max(3, duration / images.length); // At least 3 seconds per image
                console.log(`📸 Each image will show for ${imageDuration.toFixed(1)}s`);
                console.log(`🎵 Audio file: ${audioFile}`);
                
                // Use first few images if too many
                const maxImages = Math.min(images.length, 10); // Limit to 10 images for stability
                const selectedImages = images.slice(0, maxImages);
                console.log(`📸 Using ${selectedImages.length} images for slideshow`);
                
                try {
                    // Create slideshow using simple concat method
                    const tempVideos = [];
                    const actualImageDuration = duration / selectedImages.length;
                    
                    console.log('🔄 Creating individual videos for each image...');
                    for (let i = 0; i < selectedImages.length; i++) {
                        const tempVideo = `./temp/slide_${i}_${Date.now()}.mp4`;
                        const image = selectedImages[i];
                        
                        console.log(`   Processing ${i + 1}/${selectedImages.length}: ${path.basename(image)}`);
                        
                        // Create video for each image (no audio yet)
                        const imageCommand = `ffmpeg -loop 1 -i "${image}" -t ${actualImageDuration} -c:v libx264 -pix_fmt yuv420p -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" "${tempVideo}" -y`;
                        
                        await execAsync(imageCommand);
                        tempVideos.push(tempVideo);
                    }
                    
                    // Create concat file
                    const concatFile = `./temp/concat_${Date.now()}.txt`;
                    const concatContent = tempVideos.map(video => `file '${path.resolve(video)}'`).join('\n');
                    fs.writeFileSync(concatFile, concatContent);
                    
                    console.log('🔄 Concatenating videos and adding audio...');
                    
                    // Concatenate videos and add audio
                    const finalCommand = `ffmpeg -f concat -safe 0 -i "${concatFile}" -i "${audioFile}" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest "${videoFile}" -y`;
                    
                    await execAsync(finalCommand);
                    
                    // Clean up
                    tempVideos.forEach(temp => {
                        if (fs.existsSync(temp)) fs.unlinkSync(temp);
                    });
                    if (fs.existsSync(concatFile)) fs.unlinkSync(concatFile);
                    
                    console.log(`✅ Slideshow created with ${selectedImages.length} images and audio`);
                    
                } catch (slideshowError) {
                    console.error('❌ Slideshow creation failed:', slideshowError.message);
                    
                    // Fallback: Use first image with audio
                    console.log('🔄 Fallback: Using first image with audio...');
                    const fallbackCommand = `ffmpeg -loop 1 -i "${images[0]}" -i "${audioFile}" -c:v libx264 -c:a aac -b:a 192k -ar 48000 -shortest -pix_fmt yuv420p -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black" "${videoFile}" -y`;
                    
                    await execAsync(fallbackCommand);
                    console.log('✅ Fallback video created with first image and audio');
                }
            }
            
            // Verify video was created
            if (fs.existsSync(videoFile)) {
                const videoStats = fs.statSync(videoFile);
                console.log(`✅ Video created successfully: ${videoFile}`);
                console.log(`📊 Video file size: ${Math.round(videoStats.size / 1024 / 1024)}MB`);
                return videoFile;
            } else {
                throw new Error('Video file was not created');
            }

        } catch (error) {
            console.error('❌ Video creation failed:', error.message);
            console.error('🔍 Error details:', error.stack);
            
            const videoFile = `./videos/video_${videoId}.mp4`;
            
            // Fallback 1: Try with a simple placeholder image
            try {
                console.log('🔄 Fallback 1: Creating simple placeholder image...');
                
                const placeholderImage = `./images/fallback_${Date.now()}.jpg`;
                await execAsync(`ffmpeg -f lavfi -i color=c=blue:size=1920x1080:duration=1 -frames:v 1 "${placeholderImage}" -y`);
                
                if (fs.existsSync(placeholderImage)) {
                    console.log('🔄 Using placeholder image with audio...');
                    const fallbackCommand = `ffmpeg -loop 1 -i "${placeholderImage}" -i "${audioFile}" -c:v libx264 -c:a aac -b:a 192k -ar 48000 -shortest -pix_fmt yuv420p "${videoFile}" -y`;
                    
                    await execAsync(fallbackCommand);
                    console.log('✅ Created fallback video with placeholder image and audio');
                    return videoFile;
                }
                
            } catch (fallbackError1) {
                console.error('❌ Fallback 1 failed:', fallbackError1.message);
            }
            
            // Fallback 2: Solid color with audio
            try {
                console.log('🔄 Fallback 2: Solid color background with audio...');
                
                const fallbackCommand = `ffmpeg -f lavfi -i color=c=navy:size=1920x1080:duration=${duration} -i "${audioFile}" -c:v libx264 -c:a aac -b:a 192k -ar 48000 -shortest -pix_fmt yuv420p "${videoFile}" -y`;
                
                await execAsync(fallbackCommand);
                console.log('✅ Created fallback video with navy background and audio');
                return videoFile;
                
            } catch (fallbackError2) {
                console.error('❌ Fallback 2 failed:', fallbackError2.message);
                
                // Final fallback: video without audio
                try {
                    console.log('🔄 Final fallback: video without audio...');
                    await execAsync(`ffmpeg -f lavfi -i color=c=purple:size=1920x1080:duration=${duration} -c:v libx264 -pix_fmt yuv420p "${videoFile}" -y`);
                    console.log('⚠️ Created video without audio (purple background)');
                    return videoFile;
                } catch (finalError) {
                    throw new Error('All video creation methods failed');
                }
            }
        }
    }

    async createThumbnail(topic, firstImage) {
        console.log('🖼️ Creating attractive thumbnail...');
        
        try {
            const thumbnailFile = `./images/thumbnail_${Date.now()}.jpg`;
            
            await execAsync(`ffmpeg -i "${firstImage}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" "${thumbnailFile}" -y`);
            
            console.log(`✅ Thumbnail created: ${thumbnailFile}`);
            return thumbnailFile;

        } catch (error) {
            console.error('❌ Thumbnail creation error:', error.message);
            return firstImage;
        }
    }

    generateTitle(topic) {
        return `${topic} - Yeşil Hayat Rotası Rehberi`;
    }

    generateDescription(topic) {
        return `🌿 ${topic} hakkında detaylı rehber!

Bu videoda ${topic} konusunu ele alıyoruz. Yeşil Hayat Rotası kanalında doğayla iç içe yaşamanın püf noktalarını paylaşıyoruz.

🌱 Yeşil Hayat Rotası'na abone olmayı unutmayın!
🔔 Bildirimleri açarak yeni videolarımızdan haberdar olun!

#${topic.replace(/\s+/g, '')} #Bahçe #DoğalYaşam #YeşilHayatRotası`;
    }

    generateTags(topic) {
        const baseTags = ['bahçe', 'doğa', 'bitki', 'yeşil yaşam', 'organik'];
        const topicTags = topic.toLowerCase().split(' ');
        return [...baseTags, ...topicTags].slice(0, 10);
    }
}

module.exports = RealVideoCreator;