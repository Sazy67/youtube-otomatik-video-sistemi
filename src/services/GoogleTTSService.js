const textToSpeech = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

class GoogleTTSService {
    constructor() {
        // Load environment variables
        require('dotenv').config();
        
        this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
        this.keyFilename = process.env.GOOGLE_CLOUD_KEY_FILE;
        this.languageCode = process.env.GOOGLE_TTS_LANGUAGE_CODE || 'tr-TR';
        this.voiceName = process.env.GOOGLE_TTS_VOICE_NAME || 'tr-TR-Wavenet-A';
        this.voiceGender = process.env.GOOGLE_TTS_VOICE_GENDER || 'FEMALE';
        
        // Initialize the client
        try {
            const clientConfig = {};
            
            // If we have a key file, use it
            if (this.keyFilename && fs.existsSync(this.keyFilename)) {
                clientConfig.keyFilename = this.keyFilename;
                console.log('✅ Using Google Cloud key file:', this.keyFilename);
            } else if (this.projectId) {
                clientConfig.projectId = this.projectId;
                console.log('✅ Using Google Cloud project ID:', this.projectId);
            } else {
                console.log('⚠️ No Google Cloud credentials found, using default');
            }
            
            this.client = new textToSpeech.TextToSpeechClient(clientConfig);
            console.log('✅ Google Cloud TTS client initialized');
            
        } catch (error) {
            console.error('❌ Google Cloud TTS initialization failed:', error.message);
            this.client = null;
        }
    }

    async createAudio(text, outputPath) {
        if (!this.client) {
            throw new Error('Google Cloud TTS client not initialized');
        }

        console.log('🎤 Creating audio with Google Cloud TTS...');
        console.log('📝 Text length:', text.length, 'characters');
        console.log('🗣️ Voice:', this.voiceName);
        console.log('🌍 Language:', this.languageCode);

        try {
            // Construct the request
            const request = {
                input: { text: text },
                voice: {
                    languageCode: this.languageCode,
                    name: this.voiceName,
                    ssmlGender: this.voiceGender,
                },
                audioConfig: {
                    audioEncoding: 'MP3',
                    speakingRate: 1.0,
                    pitch: 0.0,
                    volumeGainDb: 0.0,
                },
            };

            // Perform the text-to-speech request
            console.log('🔄 Sending request to Google Cloud TTS...');
            const [response] = await this.client.synthesizeSpeech(request);

            // Write the binary audio content to a local file
            fs.writeFileSync(outputPath, response.audioContent, 'binary');
            
            const stats = fs.statSync(outputPath);
            console.log('✅ Audio file created:', outputPath);
            console.log('📊 File size:', Math.round(stats.size / 1024), 'KB');
            
            return outputPath;

        } catch (error) {
            console.error('❌ Google Cloud TTS error:', error.message);
            
            // If it's an authentication error, provide helpful message
            if (error.message.includes('authentication') || error.message.includes('credentials')) {
                console.error('🔑 Authentication issue detected');
                console.error('💡 Solutions:');
                console.error('   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
                console.error('   2. Place google-cloud-key.json in project root');
                console.error('   3. Run: gcloud auth application-default login');
            }
            
            throw error;
        }
    }

    async listVoices() {
        if (!this.client) {
            throw new Error('Google Cloud TTS client not initialized');
        }

        try {
            console.log('🔍 Fetching available Turkish voices...');
            const [result] = await this.client.listVoices({
                languageCode: 'tr-TR'
            });

            const voices = result.voices;
            console.log('🎭 Available Turkish voices:');
            
            voices.forEach((voice, index) => {
                console.log(`   ${index + 1}. ${voice.name} (${voice.ssmlGender})`);
            });

            return voices;

        } catch (error) {
            console.error('❌ Failed to list voices:', error.message);
            return [];
        }
    }

    // Test method to verify the service works
    async testService() {
        console.log('🧪 Testing Google Cloud TTS service...');
        
        try {
            const testText = 'Merhaba, bu Google Cloud Text-to-Speech servisi test mesajıdır.';
            const testPath = './temp/google-tts-test.mp3';
            
            // Ensure temp directory exists
            if (!fs.existsSync('./temp')) {
                fs.mkdirSync('./temp', { recursive: true });
            }
            
            await this.createAudio(testText, testPath);
            
            if (fs.existsSync(testPath)) {
                console.log('✅ Google Cloud TTS test successful!');
                console.log('🎵 Test audio file:', testPath);
                return true;
            } else {
                console.log('❌ Test audio file not created');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Google Cloud TTS test failed:', error.message);
            return false;
        }
    }
}

module.exports = GoogleTTSService;