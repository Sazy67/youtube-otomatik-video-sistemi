const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class EdgeTTSService {
    constructor() {
        console.log('🎤 Edge TTS Service initialized');
        
        // Available Turkish voices
        this.turkishVoices = [
            'tr-TR-AhmetNeural',     // Male
            'tr-TR-EmelNeural',      // Female  
            'tr-TR-SinemNeural',     // Female
            'tr-TR-BerkNeural',      // Male
            'tr-TR-CanNeural'        // Male
        ];
        
        this.defaultVoice = 'tr-TR-EmelNeural'; // Female voice
        
        console.log('🎭 Available Turkish voices:');
        this.turkishVoices.forEach((voice, index) => {
            const gender = voice.includes('Emel') || voice.includes('Sinem') ? 'Female' : 'Male';
            console.log(`   ${index + 1}. ${voice} (${gender})`);
        });
    }

    async createAudio(text, outputPath, voice = null) {
        console.log('🎤 Creating audio with Edge TTS...');
        console.log('📝 Text length:', text.length, 'characters');
        
        const selectedVoice = voice || this.defaultVoice;
        console.log('🗣️ Voice:', selectedVoice);
        
        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // Create a temporary text file for edge-tts
            const tempTextFile = `./temp/tts_text_${Date.now()}.txt`;
            fs.writeFileSync(tempTextFile, text, 'utf8');
            
            // Use edge-tts command line tool
            const command = `npx edge-tts --voice "${selectedVoice}" --file "${tempTextFile}" --write-media "${outputPath}"`;
            
            console.log('🔄 Running Edge TTS...');
            console.log('📝 Command:', command);
            
            execSync(command, { 
                stdio: 'pipe',
                timeout: 30000 // 30 second timeout
            });
            
            // Clean up temp file
            if (fs.existsSync(tempTextFile)) {
                fs.unlinkSync(tempTextFile);
            }
            
            // Verify output file was created
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('✅ Edge TTS audio created:', outputPath);
                console.log('📊 File size:', Math.round(stats.size / 1024), 'KB');
                return outputPath;
            } else {
                throw new Error('Audio file was not created');
            }
            
        } catch (error) {
            console.error('❌ Edge TTS error:', error.message);
            
            // Clean up temp file on error
            const tempTextFile = `./temp/tts_text_${Date.now()}.txt`;
            if (fs.existsSync(tempTextFile)) {
                fs.unlinkSync(tempTextFile);
            }
            
            throw error;
        }
    }

    async listVoices() {
        console.log('🎭 Turkish voices available:');
        this.turkishVoices.forEach((voice, index) => {
            const gender = voice.includes('Emel') || voice.includes('Sinem') ? 'Female' : 'Male';
            const isDefault = voice === this.defaultVoice ? ' (Default)' : '';
            console.log(`   ${index + 1}. ${voice} (${gender})${isDefault}`);
        });
        return this.turkishVoices;
    }

    async testService() {
        console.log('🧪 Testing Edge TTS service...');
        
        try {
            const testText = 'Merhaba, bu Microsoft Edge Text-to-Speech servisi test mesajıdır. Türkçe ses kalitesi çok iyi!';
            const testPath = './temp/edge-tts-test.wav';
            
            // Ensure temp directory exists
            if (!fs.existsSync('./temp')) {
                fs.mkdirSync('./temp', { recursive: true });
            }
            
            await this.createAudio(testText, testPath);
            
            if (fs.existsSync(testPath)) {
                console.log('✅ Edge TTS test successful!');
                console.log('🎵 Test audio file:', testPath);
                return true;
            } else {
                console.log('❌ Test audio file not created');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Edge TTS test failed:', error.message);
            return false;
        }
    }
}

module.exports = EdgeTTSService;