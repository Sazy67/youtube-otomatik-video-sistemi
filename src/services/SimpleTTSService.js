const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SimpleTTSService {
    constructor() {
        console.log('🎤 Simple TTS Service initialized');
        console.log('🔊 Using FFmpeg tone generation for audio');
    }

    async createAudio(text, outputPath) {
        console.log('🎤 Creating simple audio with FFmpeg...');
        console.log('📝 Text length:', text.length, 'characters');
        
        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // Calculate duration based on text length (rough estimate: 15 chars per second)
            const estimatedDuration = Math.max(10, Math.floor(text.length / 15));
            console.log('⏱️ Estimated duration:', estimatedDuration, 'seconds');
            
            // Create a simple pleasant tone
            const toneCommand = `ffmpeg -f lavfi -i "sine=frequency=440:duration=${estimatedDuration}" -ar 48000 -ac 2 "${outputPath}" -y`;
            
            console.log('🔄 Generating tone sequence...');
            
            execSync(toneCommand, { 
                stdio: 'pipe',
                timeout: 30000 // 30 second timeout
            });
            
            // Verify output file was created
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('✅ Simple TTS audio created:', outputPath);
                console.log('📊 File size:', Math.round(stats.size / 1024), 'KB');
                console.log('🎵 Audio type: Pleasant tone sequence');
                return outputPath;
            } else {
                throw new Error('Audio file was not created');
            }
            
        } catch (error) {
            console.error('❌ Simple TTS error:', error.message);
            throw error;
        }
    }

    async testService() {
        console.log('🧪 Testing Simple TTS service...');
        
        try {
            const testText = 'Bu basit TTS servisi test mesajıdır. Ton dizisi oluşturuyor.';
            const testPath = './temp/simple-tts-test.wav';
            
            // Ensure temp directory exists
            if (!fs.existsSync('./temp')) {
                fs.mkdirSync('./temp', { recursive: true });
            }
            
            await this.createAudio(testText, testPath);
            
            if (fs.existsSync(testPath)) {
                console.log('✅ Simple TTS test successful!');
                console.log('🎵 Test audio file:', testPath);
                return true;
            } else {
                console.log('❌ Test audio file not created');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Simple TTS test failed:', error.message);
            return false;
        }
    }
}

module.exports = SimpleTTSService;