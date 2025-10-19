import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { VoiceConfig, AudioFile } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  ExternalServiceError, 
  ValidationError,
  FileStorageError 
} from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';

export class TextToSpeechService {
  private elevenLabsApiKey: string;
  private baseUrl: string = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.elevenLabsApiKey = config.elevenlabs.apiKey;
  }

  /**
   * Generate speech from text using ElevenLabs
   */
  async generateSpeech(text: string, voiceConfig: VoiceConfig): Promise<AudioFile> {
    try {
      if (!text || text.trim().length === 0) {
        throw new ValidationError('Text is required for speech generation');
      }

      if (text.length > 50000) {
        throw new ValidationError('Text is too long (max 50,000 characters)');
      }

      logger.info('Generating speech', { 
        textLength: text.length, 
        voiceId: voiceConfig.voiceId,
        provider: voiceConfig.provider 
      });

      let audioBuffer: Buffer;
      
      switch (voiceConfig.provider) {
        case 'elevenlabs':
          audioBuffer = await this.generateWithElevenLabs(text, voiceConfig);
          break;
        case 'azure':
          audioBuffer = await this.generateWithAzure(text, voiceConfig);
          break;
        case 'google':
          audioBuffer = await this.generateWithGoogle(text, voiceConfig);
          break;
        default:
          throw new ValidationError(`Unsupported TTS provider: ${voiceConfig.provider}`);
      }

      // Save audio file
      const audioFile = await this.saveAudioFile(audioBuffer, 'mp3');
      
      logger.info('Speech generated successfully', { 
        audioFileId: audioFile.id,
        duration: audioFile.duration,
        size: audioFile.size 
      });

      return audioFile;
    } catch (error) {
      logger.error('Speech generation failed', error as Error, { 
        textLength: text?.length,
        voiceProvider: voiceConfig?.provider 
      });
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new ExternalServiceError(
        voiceConfig?.provider || 'TTS', 
        `Speech generation failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Generate speech using ElevenLabs API
   */
  private async generateWithElevenLabs(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
    try {
      const url = `${this.baseUrl}/text-to-speech/${voiceConfig.voiceId}`;
      
      const requestData = {
        text,
        model_id: config.elevenlabs.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      };

      const response = await axios.post(url, requestData, {
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        responseType: 'arraybuffer',
        timeout: 60000, // 60 seconds timeout
      });

      if (response.status !== 200) {
        throw new Error(`ElevenLabs API returned status ${response.status}`);
      }

      return Buffer.from(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.detail?.message || error.message;
        
        if (status === 401) {
          throw new ExternalServiceError('ElevenLabs', 'Invalid API key');
        } else if (status === 429) {
          throw new ExternalServiceError('ElevenLabs', 'Rate limit exceeded', true);
        } else if (status === 422) {
          throw new ValidationError(`ElevenLabs validation error: ${message}`);
        }
        
        throw new ExternalServiceError('ElevenLabs', `API error: ${message}`, true);
      }
      
      throw error;
    }
  }

  /**
   * Generate speech using Azure Cognitive Services (placeholder)
   */
  private async generateWithAzure(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
    // This is a placeholder implementation
    // In a real implementation, you would use Azure Cognitive Services Speech SDK
    throw new ExternalServiceError('Azure', 'Azure TTS not implemented yet');
  }

  /**
   * Generate speech using Google Cloud Text-to-Speech (placeholder)
   */
  private async generateWithGoogle(text: string, voiceConfig: VoiceConfig): Promise<Buffer> {
    // This is a placeholder implementation
    // In a real implementation, you would use Google Cloud Text-to-Speech API
    throw new ExternalServiceError('Google', 'Google TTS not implemented yet');
  }

  /**
   * Save audio buffer to file
   */
  private async saveAudioFile(audioBuffer: Buffer, format: string): Promise<AudioFile> {
    try {
      const audioId = uuidv4();
      const filename = `audio_${audioId}.${format}`;
      const audioDir = path.join(config.storage.basePath, 'audio');
      const filePath = path.join(audioDir, filename);

      // Ensure directory exists
      await fs.mkdir(audioDir, { recursive: true });

      // Write audio file
      await fs.writeFile(filePath, audioBuffer);

      // Get audio duration (placeholder - would need audio analysis library)
      const duration = this.estimateAudioDuration(audioBuffer, format);

      const audioFile: AudioFile = {
        id: audioId,
        filename,
        path: filePath,
        duration,
        format,
        size: audioBuffer.length,
      };

      logger.debug('Audio file saved', { 
        audioId, 
        filename, 
        size: audioBuffer.length,
        duration 
      });

      return audioFile;
    } catch (error) {
      logger.error('Failed to save audio file', error as Error);
      throw new FileStorageError(`Failed to save audio file: ${(error as Error).message}`);
    }
  }

  /**
   * Estimate audio duration based on text length and speaking rate
   */
  private estimateAudioDuration(audioBuffer: Buffer, format: string): number {
    // This is a rough estimation
    // In a real implementation, you would use an audio analysis library like node-ffmpeg
    // to get the actual duration from the audio file
    
    // For now, estimate based on buffer size and typical bitrate
    const avgBitrate = 128000; // 128 kbps for MP3
    const estimatedDuration = (audioBuffer.length * 8) / avgBitrate;
    
    return Math.round(estimatedDuration);
  }

  /**
   * Get available voices for a provider
   */
  async getAvailableVoices(provider: 'elevenlabs' | 'azure' | 'google'): Promise<any[]> {
    try {
      switch (provider) {
        case 'elevenlabs':
          return await this.getElevenLabsVoices();
        case 'azure':
          return await this.getAzureVoices();
        case 'google':
          return await this.getGoogleVoices();
        default:
          throw new ValidationError(`Unsupported provider: ${provider}`);
      }
    } catch (error) {
      logger.error('Failed to get available voices', error as Error, { provider });
      throw error;
    }
  }

  /**
   * Get ElevenLabs voices
   */
  private async getElevenLabsVoices(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/voices`, {
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
        },
      });

      return response.data.voices.map((voice: any) => ({
        id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        previewUrl: voice.preview_url,
        settings: voice.settings,
      }));
    } catch (error) {
      throw new ExternalServiceError('ElevenLabs', `Failed to get voices: ${(error as Error).message}`);
    }
  }

  /**
   * Get Azure voices (placeholder)
   */
  private async getAzureVoices(): Promise<any[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Get Google voices (placeholder)
   */
  private async getGoogleVoices(): Promise<any[]> {
    // Placeholder implementation
    return [];
  }

  /**
   * Split long text into chunks for TTS processing
   */
  splitTextIntoChunks(text: string, maxChunkSize: number = 5000): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.split(/[.!?]+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (!trimmedSentence) continue;

      const sentenceWithPunctuation = trimmedSentence + '.';
      
      if (currentChunk.length + sentenceWithPunctuation.length > maxChunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }
        
        // If single sentence is too long, split by words
        if (sentenceWithPunctuation.length > maxChunkSize) {
          const words = sentenceWithPunctuation.split(' ');
          let wordChunk = '';
          
          for (const word of words) {
            if (wordChunk.length + word.length + 1 > maxChunkSize) {
              if (wordChunk) {
                chunks.push(wordChunk.trim());
                wordChunk = '';
              }
            }
            wordChunk += (wordChunk ? ' ' : '') + word;
          }
          
          if (wordChunk) {
            currentChunk = wordChunk;
          }
        } else {
          currentChunk = sentenceWithPunctuation;
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentenceWithPunctuation;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Generate speech for long text by splitting into chunks
   */
  async generateSpeechForLongText(text: string, voiceConfig: VoiceConfig): Promise<AudioFile> {
    try {
      const chunks = this.splitTextIntoChunks(text, 4000); // Conservative chunk size
      
      if (chunks.length === 1) {
        return await this.generateSpeech(text, voiceConfig);
      }

      logger.info('Generating speech for long text', { 
        textLength: text.length, 
        chunks: chunks.length 
      });

      // Generate audio for each chunk
      const audioFiles: AudioFile[] = [];
      for (let i = 0; i < chunks.length; i++) {
        logger.debug(`Generating chunk ${i + 1}/${chunks.length}`);
        const chunkAudio = await this.generateSpeech(chunks[i], voiceConfig);
        audioFiles.push(chunkAudio);
      }

      // Combine audio files (placeholder - would need audio processing library)
      const combinedAudio = await this.combineAudioFiles(audioFiles);
      
      // Clean up individual chunk files
      await Promise.all(audioFiles.map(file => 
        fs.unlink(file.path).catch(err => 
          logger.warn('Failed to delete chunk file', { error: err.message, file: file.path })
        )
      ));

      return combinedAudio;
    } catch (error) {
      logger.error('Failed to generate speech for long text', error as Error);
      throw error;
    }
  }

  /**
   * Combine multiple audio files into one (placeholder)
   */
  private async combineAudioFiles(audioFiles: AudioFile[]): Promise<AudioFile> {
    // This is a placeholder implementation
    // In a real implementation, you would use FFmpeg or similar to concatenate audio files
    
    if (audioFiles.length === 0) {
      throw new ValidationError('No audio files to combine');
    }

    if (audioFiles.length === 1) {
      return audioFiles[0];
    }

    // For now, just return the first file as a placeholder
    // In production, implement proper audio concatenation
    const combinedDuration = audioFiles.reduce((total, file) => total + file.duration, 0);
    const combinedSize = audioFiles.reduce((total, file) => total + file.size, 0);

    return {
      ...audioFiles[0],
      id: uuidv4(),
      filename: `combined_${uuidv4()}.mp3`,
      duration: combinedDuration,
      size: combinedSize,
    };
  }
}

export const textToSpeechService = new TextToSpeechService();