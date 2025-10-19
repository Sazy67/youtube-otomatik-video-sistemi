const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { GoogleGenerativeAI } = require('@google/generative-ai');

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
            this.geminiModel = this.genAI.getGenerativeModel({ model: "gemini-pro" });
        }
        
        // Debug API keys
        console.log('🔑 API Keys loaded:');
        console.log('   OpenAI:', this.openaiApiKey ? '✅ Set' : '❌ Missing');
        console.log('   Gemini:', this.geminiApiKey && this.geminiApiKey !== 'your-gemini-api-key-here' ? '✅ Set' : '❌ Missing');
        console.log('   ElevenLabs:', this.elevenlabsApiKey ? '✅ Set' : '❌ Missing');
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
        const progress = {
            step: 0,
            total: 6,
            status: 'starting',
            videoId: videoId
        };

        try {
            // Step 1: Generate AI Script
            progress.step = 1;
            progress.status = 'Generating AI script...';
            console.log('📝 Step 1/6: Generating AI script...');
            const script = await this.generateScript(topic, duration, style);
            
            // Step 2: Create Audio
            progress.step = 2;
            progress.status = 'Creating professional Turkish voiceover...';
            console.log('🎤 Step 2/6: Creating voiceover...');
            const audioFile = await this.createAudio(script, videoId);
            
            // Step 3: Gather Images
            progress.step = 3;
            progress.status = 'Gathering high-quality images...';
            console.log('🖼️ Step 3/6: Gathering images...');
            const images = await this.gatherImages(topic);
            
            // Step 4: Create Video
            progress.step = 4;
            progress.status = 'Assembling video with FFmpeg...';
            console.log('🎞️ Step 4/6: Creating video...');
            const videoFile = await this.assembleVideo(audioFile, images, videoId, duration);
            
            // Step 5: Create Thumbnail
            progress.step = 5;
            progress.status = 'Creating attractive thumbnail...';
            console.log('🖼️ Step 5/6: Creating thumbnail...');
            const thumbnail = await this.createThumbnail(topic, images[0]);
            
            // Step 6: Prepare for Upload
            progress.step = 6;
            progress.status = 'Preparing for YouTube upload...';
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
                    description: this.generateDescription(topic, script),
                    tags: this.generateTags(topic),
                    category: 'Education'
                },
                status: 'ready_for_upload'
            };

            console.log('✅ REAL video creation completed!');
            console.log(`📁 Video file: ${videoFile}`);
            console.log(`🖼️ Thumbnail: ${thumbnail}`);
            console.log(`📝 Script length: ${script.length} characters`);
            
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

        // Try Gemini first, then OpenAI as fallback
        if (this.geminiModel) {
            try {
                console.log('🤖 Using Google Gemini Pro...');
                const result = await this.geminiModel.generateContent(prompt);
                const response = await result.response;
                const script = response.text();
                
                // Save script to file
                const scriptFile = `./temp/script_${Date.now()}.txt`;
                fs.writeFileSync(scriptFile, script, 'utf8');
                
                console.log(`✅ Gemini script generated: ${script.length} characters`);
                return script;

            } catch (error) {
                console.error('❌ Gemini API error:', error.message);
                console.log('🔄 Trying OpenAI as fallback...');
            }
        }

        // OpenAI fallback
        if (this.openaiApiKey) {
            try {
                console.log('🤖 Using OpenAI as fallback...');
                const response = await axios.post('https://api.openai.com/v1/chat/completions', {
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a professional Turkish content creator specializing in gardening and nature content for YouTube.'
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    max_tokens: 2000,
                    temperature: 0.7
                }, {
                    headers: {
                        'Authorization': `Bearer ${this.openaiApiKey}`,
                        'Content-Type': 'application/json'
                    }
                });

                const script = response.data.choices[0].message.content;
                
                // Save script to file
                const scriptFile = `./temp/script_${Date.now()}.txt`;
                fs.writeFileSync(scriptFile, script, 'utf8');
                
                console.log(`✅ OpenAI script generated: ${script.length} characters`);
                return script;

            } catch (error) {
                console.error('❌ OpenAI API error:', error.response?.data || error.message);
            }
        }
            
            // Enhanced fallback script
            const fallbackScript = `Merhaba değerli Yeşil Hayat Rotası izleyicileri! Ben bugün sizlerle ${topic} konusunu detaylıca ele alacağım.

${topic}, bahçe tutkunları ve doğa severlerin en çok merak ettiği konulardan biri. Bu videoda size pratik bilgiler ve deneyimli bahçıvanların püf noktalarını paylaşacağım.

${topic} konusunda başarılı olmak için dikkat etmeniz gereken temel noktalar şunlar:

Birincisi, doğru zamanlama çok önemlidir. Her bitkinin kendine özgü bir takvimi vardır ve bu takvime uygun hareket etmek gerekir.

İkincisi, toprak hazırlığı başarının temelidir. Kaliteli toprak, sağlıklı bitkilerin en önemli şartıdır. Organik gübre kullanımını ihmal etmeyin.

Üçüncüsü, sulama tekniği kritik öneme sahiptir. Ne çok su ne de az su vermeyin. Bitkinin ihtiyacını gözlemleyerek sulama yapın.

Dördüncüsü, hastalık ve zararlılardan korunma için önleyici tedbirler alın. Doğal yöntemleri tercih ederek hem çevreyi hem de sağlığınızı koruyun.

Beşincisi, sabırlı olun ve düzenli bakım yapın. Bahçıvanlık bir maraton gibidir, sabırla ve sevgiyle yaklaştığınızda en güzel sonuçları alırsınız.

${topic} hakkında daha detaylı bilgi almak, sorularınızı sormak ve deneyimlerinizi paylaşmak için yorumlarda buluşalım. 

Kanalımıza abone olmayı ve bildirimleri açmayı unutmayın. Yeşil Hayat Rotası'nda doğayla uyum içinde yaşamanın sırlarını birlikte keşfediyoruz.

Bir sonraki videomuzda görüşmek üzere, herkese sağlıklı ve bereketli günler dilerim!`;

            console.log('⚠️ Using fallback script');
            return fallbackScript;
        }
    }

    async createAudio(script, videoId) {
        console.log('🎤 Creating professional Turkish voiceover...');
        
        try {
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

            const audioFile = `./audio/audio_${videoId}.mp3`;
            fs.writeFileSync(audioFile, response.data);
            
            console.log(`✅ Audio created: ${audioFile}`);
            return audioFile;

        } catch (error) {
            console.error('❌ ElevenLabs API error:', error.response?.data || error.message);
            
            // Create a placeholder audio file (silent)
            const audioFile = `./audio/audio_${videoId}.mp3`;
            await execAsync(`ffmpeg -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 -t 10 "${audioFile}" -y`);
            
            console.log('⚠️ Created placeholder audio file');
            return audioFile;
        }
    }

    async gatherImages(topic) {
        console.log('🖼️ Gathering high-quality images from Unsplash...');
        
        try {
            // Search for relevant images
            const searchTerms = this.generateImageSearchTerms(topic);
            console.log('🔍 Search terms:', searchTerms);
            const images = [];
            
            // Try to download at least 3 images
            let attempts = 0;
            const maxAttempts = 10;
            
            while (images.length < 3 && attempts < maxAttempts) {
                const term = searchTerms[attempts % searchTerms.length];
                attempts++;
                
                try {
                    console.log(`🔍 Searching for: ${term} (attempt ${attempts})`);
                    
                    console.log(`🔑 Using Unsplash key: ${this.unsplashAccessKey ? this.unsplashAccessKey.substring(0, 10) + '...' : 'MISSING'}`);
                    
                    const response = await axios.get('https://api.unsplash.com/search/photos', {
                        params: {
                            query: term,
                            per_page: 3,
                            orientation: 'landscape'
                        },
                        headers: {
                            'Authorization': `Client-ID ${this.unsplashAccessKey}`
                        },
                        timeout: 10000
                    });

                    console.log(`📊 Found ${response.data.results.length} images for: ${term}`);

                    if (response.data.results.length > 0) {
                        for (const photo of response.data.results.slice(0, 2)) {
                            try {
                                const imageUrl = photo.urls.regular;
                                console.log(`📥 Downloading: ${imageUrl}`);
                                
                                // Download image with timeout
                                const imageResponse = await axios.get(imageUrl, { 
                                    responseType: 'arraybuffer',
                                    timeout: 15000
                                });
                                
                                const imagePath = `./images/image_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
                                fs.writeFileSync(imagePath, imageResponse.data);
                                
                                // Verify file was created and has content
                                const stats = fs.statSync(imagePath);
                                if (stats.size > 1000) { // At least 1KB
                                    images.push(imagePath);
                                    console.log(`✅ Downloaded: ${term} -> ${imagePath} (${stats.size} bytes)`);
                                    
                                    if (images.length >= 3) break;
                                } else {
                                    console.log(`⚠️ File too small, deleting: ${imagePath}`);
                                    fs.unlinkSync(imagePath);
                                }
                                
                            } catch (downloadErr) {
                                console.log(`⚠️ Download failed for image: ${downloadErr.message}`);
                            }
                        }
                    }
                } catch (err) {
                    console.log(`⚠️ Search failed for: ${term} - ${err.message}`);
                }
            }

            if (images.length === 0) {
                // Use pre-downloaded sample images
                console.log('🖼️ Using sample garden images...');
                
                for (let i = 1; i <= 3; i++) {
                    const samplePath = `./images/sample_${i}.jpg`;
                    if (fs.existsSync(samplePath)) {
                        images.push(samplePath);
                        console.log(`✅ Using sample image: ${samplePath}`);
                    }
                }
                
                // If sample images don't exist, create placeholders
                if (images.length === 0) {
                    // Use pre-downloaded sample images
                    console.log('📸 Using sample garden images...');
                    for (let i = 1; i <= 3; i++) {
                        const samplePath = `./images/sample_${i}.jpg`;
                        if (fs.existsSync(samplePath)) {
                            images.push(samplePath);
                            console.log(`✅ Using sample image: ${samplePath}`);
                        }
                    }
                    
                    // If sample images don't exist, create placeholders
                    if (images.length === 0) {
                        for (let i = 0; i < 3; i++) {
                            const placeholderPath = `./images/placeholder_${Date.now()}_${i}.jpg`;
                            await execAsync(`ffmpeg -f lavfi -i color=c=green:size=1920x1080:duration=1 -frames:v 1 -update 1 "${placeholderPath}" -y`);
                            images.push(placeholderPath);
                        }
                        console.log('⚠️ Created placeholder images');
                    }
                }
            }

            console.log(`✅ Gathered ${images.length} images`);
            return images;

        } catch (error) {
            console.error('❌ Image gathering error:', error.message);
            
            // Use pre-downloaded sample images
            const images = [];
            console.log('🖼️ Using sample garden images (fallback)...');
            
            for (let i = 1; i <= 3; i++) {
                const samplePath = `./images/sample_${i}.jpg`;
                if (fs.existsSync(samplePath)) {
                    images.push(samplePath);
                    console.log(`✅ Using sample image: ${samplePath}`);
                }
            }
            
            // If sample images don't exist, create placeholders
            if (images.length === 0) {
                for (let i = 0; i < 3; i++) {
                    const placeholderPath = `./images/placeholder_${Date.now()}_${i}.jpg`;
                    await execAsync(`ffmpeg -f lavfi -i color=c=green:size=1920x1080:duration=1 -frames:v 1 -update 1 "${placeholderPath}" -y`);
                    images.push(placeholderPath);
                }
                console.log('⚠️ Created placeholder images');
            }
            
            return images;
        }
    }

    async assembleVideo(audioFile, images, videoId, duration) {
        console.log('🎞️ Assembling video with FFmpeg...');
        
        try {
            const videoFile = `./videos/video_${videoId}.mp4`;
            
            // Create image slideshow with audio
            const imageDuration = duration / images.length;
            let filterComplex = '';
            let inputs = '';
            
            // Add images as inputs
            images.forEach((image, index) => {
                inputs += `-loop 1 -t ${imageDuration} -i "${image}" `;
                if (index > 0) {
                    filterComplex += `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS+${index * imageDuration}/TB[v${index}];`;
                } else {
                    filterComplex += `[${index}:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setpts=PTS-STARTPTS[v${index}];`;
                }
            });
            
            // Concatenate videos
            filterComplex += images.map((_, index) => `[v${index}]`).join('') + `concat=n=${images.length}:v=1:a=0[outv]`;
            
            const ffmpegCommand = `ffmpeg ${inputs} -i "${audioFile}" -filter_complex "${filterComplex}" -map "[outv]" -map ${images.length}:a -c:v libx264 -c:a aac -pix_fmt yuv420p -r 30 "${videoFile}" -y`;
            
            console.log('🔄 Running FFmpeg...');
            await execAsync(ffmpegCommand);
            
            console.log(`✅ Video assembled: ${videoFile}`);
            return videoFile;

        } catch (error) {
            console.error('❌ Video assembly error:', error.message);
            
            // Create a simple placeholder video
            const videoFile = `./videos/video_${videoId}.mp4`;
            await execAsync(`ffmpeg -f lavfi -i color=c=green:size=1920x1080:duration=${duration} -i "${audioFile}" -c:v libx264 -c:a aac -pix_fmt yuv420p "${videoFile}" -y`);
            
            console.log('⚠️ Created placeholder video');
            return videoFile;
        }
    }

    async createThumbnail(topic, firstImage) {
        console.log('🖼️ Creating attractive thumbnail...');
        
        try {
            const thumbnailFile = `./images/thumbnail_${Date.now()}.jpg`;
            
            // Create thumbnail with text overlay
            const title = this.generateTitle(topic).substring(0, 50);
            
            await execAsync(`ffmpeg -i "${firstImage}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,drawtext=text='${title}':fontcolor=white:fontsize=48:box=1:boxcolor=black@0.5:boxborderw=5:x=(w-text_w)/2:y=(h-text_h)/2" "${thumbnailFile}" -y`);
            
            console.log(`✅ Thumbnail created: ${thumbnailFile}`);
            return thumbnailFile;

        } catch (error) {
            console.error('❌ Thumbnail creation error:', error.message);
            
            // Use first image as thumbnail
            return firstImage;
        }
    }

    generateImageSearchTerms(topic) {
        const baseTerms = ['garden', 'nature', 'plant', 'green', 'flower'];
        const topicWords = topic.toLowerCase().split(' ');
        return [...baseTerms, ...topicWords, 'gardening', 'botanical'];
    }

    generateTitle(topic) {
        return `${topic} - Yeşil Hayat Rotası Rehberi`;
    }

    generateDescription(topic, script) {
        return `🌿 ${topic} hakkında detaylı rehber!

Bu videoda ${topic} konusunu ele alıyoruz. Yeşil Hayat Rotası kanalında doğayla iç içe yaşamanın püf noktalarını paylaşıyoruz.

📋 Video İçeriği:
${script.substring(0, 200)}...

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