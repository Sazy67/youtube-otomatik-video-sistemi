const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class WindowsTTSService {
    constructor() {
        console.log('🎤 Windows TTS Service initialized');
        
        // Available Windows Turkish voices
        this.turkishVoices = [
            'Microsoft Tolga Desktop',    // Male Turkish
            'Microsoft Seda Desktop',     // Female Turkish
            'Microsoft Hazel Desktop'     // Female English (backup)
        ];
        
        this.defaultVoice = 'Microsoft Tolga Desktop'; // Male Turkish voice
        
        console.log('🎭 Windows Turkish voices available');
    }

    async createAudio(text, outputPath, voice = null) {
        console.log('🎤 Creating audio with Windows TTS...');
        console.log('📝 Text length:', text.length, 'characters');
        
        const selectedVoice = voice || this.defaultVoice;
        console.log('🗣️ Voice:', selectedVoice);
        
        try {
            // Ensure output directory exists
            const outputDir = path.dirname(outputPath);
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            
            // Escape text for PowerShell
            const escapedText = text.replace(/"/g, '""').replace(/'/g, "''");
            const escapedPath = outputPath.replace(/\\/g, '\\\\');
            
            // Create PowerShell script for TTS
            const psScript = `
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# List all available voices for debugging
Write-Host "Available voices:"
$synth.GetInstalledVoices() | ForEach-Object { 
    Write-Host "  - " $_.VoiceInfo.Name "(" $_.VoiceInfo.Culture ")"
}

# Try to set Turkish voice
try {
    $voices = $synth.GetInstalledVoices()
    $turkishVoice = $voices | Where-Object { 
        $_.VoiceInfo.Name -like "*Tolga*" -or 
        $_.VoiceInfo.Name -like "*Seda*" -or 
        $_.VoiceInfo.Culture.Name -eq "tr-TR" 
    }
    if ($turkishVoice) {
        $synth.SelectVoice($turkishVoice[0].VoiceInfo.Name)
        Write-Host "Using Turkish voice: " $turkishVoice[0].VoiceInfo.Name
    } else {
        Write-Host "Turkish voice not found, using default voice"
    }
} catch {
    Write-Host "Error selecting voice, using default"
}

# Set output to WAV file
$synth.SetOutputToWaveFile("${escapedPath}")

# Speak the text
$text = "${escapedText}"
Write-Host "Speaking text length: " $text.Length " characters"
$synth.Speak($text)

# Clean up
$synth.Dispose()
Write-Host "Audio saved to: ${escapedPath}"

# Check file size
if (Test-Path "${escapedPath}") {
    $fileSize = (Get-Item "${escapedPath}").Length
    Write-Host "File size: " $fileSize " bytes"
} else {
    Write-Host "ERROR: File was not created!"
}
`;

            // Save PowerShell script to temp file
            const tempPsFile = `./temp/tts_script_${Date.now()}.ps1`;
            fs.writeFileSync(tempPsFile, psScript, 'utf8');
            
            console.log('🔄 Running Windows TTS...');
            
            // Execute PowerShell script
            execSync(`powershell -ExecutionPolicy Bypass -File "${tempPsFile}"`, { 
                stdio: 'pipe',
                timeout: 30000 // 30 second timeout
            });
            
            // Clean up temp file
            if (fs.existsSync(tempPsFile)) {
                fs.unlinkSync(tempPsFile);
            }
            
            // Verify output file was created
            if (fs.existsSync(outputPath)) {
                const stats = fs.statSync(outputPath);
                console.log('✅ Windows TTS audio created:', outputPath);
                console.log('📊 File size:', Math.round(stats.size / 1024), 'KB');
                return outputPath;
            } else {
                throw new Error('Audio file was not created');
            }
            
        } catch (error) {
            console.error('❌ Windows TTS error:', error.message);
            
            // Clean up temp file on error
            const tempPsFile = `./temp/tts_script_${Date.now()}.ps1`;
            if (fs.existsSync(tempPsFile)) {
                fs.unlinkSync(tempPsFile);
            }
            
            throw error;
        }
    }

    async listVoices() {
        console.log('🎭 Windows TTS voices:');
        this.turkishVoices.forEach((voice, index) => {
            const gender = voice.includes('Tolga') ? 'Male' : 'Female';
            const isDefault = voice === this.defaultVoice ? ' (Default)' : '';
            console.log(`   ${index + 1}. ${voice} (${gender})${isDefault}`);
        });
        return this.turkishVoices;
    }

    async testService() {
        console.log('🧪 Testing Windows TTS service...');
        
        try {
            const testText = 'Merhaba, bu Windows Text-to-Speech servisi test mesajıdır. Türkçe ses kalitesi nasıl?';
            const testPath = './temp/windows-tts-test.wav';
            
            // Ensure temp directory exists
            if (!fs.existsSync('./temp')) {
                fs.mkdirSync('./temp', { recursive: true });
            }
            
            await this.createAudio(testText, testPath);
            
            if (fs.existsSync(testPath)) {
                console.log('✅ Windows TTS test successful!');
                console.log('🎵 Test audio file:', testPath);
                return true;
            } else {
                console.log('❌ Test audio file not created');
                return false;
            }
            
        } catch (error) {
            console.error('❌ Windows TTS test failed:', error.message);
            return false;
        }
    }
}

module.exports = WindowsTTSService;