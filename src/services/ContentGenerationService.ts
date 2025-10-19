import OpenAI from 'openai';
import { ContentGenerationService } from '../types/services';
import { Script, ScriptSection, VoiceConfig, AudioFile } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { 
  ExternalServiceError, 
  ValidationError,
  errorHandler 
} from '../utils/errors';
import { v4 as uuidv4 } from 'uuid';
import { textToSpeechService } from './TextToSpeechService';

export class AIContentGenerationService implements ContentGenerationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Generate script from topic using AI
   */
  async generateScript(topic: string, duration: number): Promise<Script> {
    try {
      if (!topic || topic.trim().length === 0) {
        throw new ValidationError('Topic is required');
      }

      if (duration < 60 || duration > 1800) { // 1 minute to 30 minutes
        throw new ValidationError('Duration must be between 60 and 1800 seconds');
      }

      logger.info('Generating script', { topic, duration });

      const wordsPerMinute = 150; // Average speaking rate
      const targetWords = Math.floor((duration / 60) * wordsPerMinute);
      
      const prompt = this.buildScriptPrompt(topic, duration, targetWords);
      
      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert content creator who specializes in creating engaging, educational YouTube video scripts. You create well-structured, informative content that keeps viewers engaged throughout the video.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.openai.maxTokens,
        temperature: 0.7,
      });

      const scriptContent = completion.choices[0]?.message?.content;
      if (!scriptContent) {
        throw new ExternalServiceError('OpenAI', 'No script content generated');
      }

      const script = this.parseScriptContent(scriptContent, topic, duration);
      
      logger.info('Script generated successfully', { 
        scriptId: script.id, 
        topic, 
        sections: script.sections.length,
        estimatedDuration: script.estimatedDuration 
      });

      return script;
    } catch (error) {
      logger.error('Script generation failed', error as Error, { topic, duration });
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new ExternalServiceError('OpenAI', `Script generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Optimize content for target duration
   */
  async optimizeContent(content: string, targetDuration: number): Promise<string> {
    try {
      if (!content || content.trim().length === 0) {
        throw new ValidationError('Content is required');
      }

      const currentWords = content.split(/\s+/).length;
      const wordsPerMinute = 150;
      const currentDuration = (currentWords / wordsPerMinute) * 60;
      const targetWords = Math.floor((targetDuration / 60) * wordsPerMinute);

      logger.info('Optimizing content', { 
        currentWords, 
        targetWords, 
        currentDuration, 
        targetDuration 
      });

      if (Math.abs(currentDuration - targetDuration) < 30) {
        // Content is already close to target duration
        return content;
      }

      const action = currentDuration > targetDuration ? 'shorten' : 'expand';
      
      const prompt = `
Please ${action} the following content to approximately ${targetWords} words (target duration: ${Math.floor(targetDuration / 60)} minutes ${targetDuration % 60} seconds).

Current content (${currentWords} words):
${content}

Requirements:
- Maintain the core message and key points
- Keep the engaging tone and structure
- ${action === 'shorten' ? 'Remove redundant information and condense explanations' : 'Add more examples, explanations, and relevant details'}
- Ensure smooth transitions between sections
- Keep it suitable for YouTube audience

Optimized content:`;

      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert content editor who specializes in optimizing video scripts for specific durations while maintaining quality and engagement.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: config.openai.maxTokens,
        temperature: 0.5,
      });

      const optimizedContent = completion.choices[0]?.message?.content;
      if (!optimizedContent) {
        throw new ExternalServiceError('OpenAI', 'No optimized content generated');
      }

      const optimizedWords = optimizedContent.split(/\s+/).length;
      logger.info('Content optimized successfully', { 
        originalWords: currentWords,
        optimizedWords,
        targetWords 
      });

      return optimizedContent.trim();
    } catch (error) {
      logger.error('Content optimization failed', error as Error);
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new ExternalServiceError('OpenAI', `Content optimization failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generate speech from script
   */
  async generateSpeech(script: Script, voice: VoiceConfig): Promise<AudioFile> {
    try {
      if (!script || !script.content) {
        throw new ValidationError('Script content is required');
      }

      if (!voice || !voice.voiceId) {
        throw new ValidationError('Voice configuration is required');
      }

      logger.info('Generating speech from script', { 
        scriptId: script.id, 
        contentLength: script.content.length,
        voiceProvider: voice.provider 
      });

      // Use the text-to-speech service to generate audio
      const audioFile = await textToSpeechService.generateSpeechForLongText(
        script.content, 
        voice
      );

      logger.info('Speech generated from script successfully', { 
        scriptId: script.id,
        audioFileId: audioFile.id,
        duration: audioFile.duration 
      });

      return audioFile;
    } catch (error) {
      logger.error('Failed to generate speech from script', error as Error, { 
        scriptId: script?.id,
        voiceProvider: voice?.provider 
      });
      throw error;
    }
  }

  /**
   * Build prompt for script generation
   */
  private buildScriptPrompt(topic: string, duration: number, targetWords: number): string {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    
    return `
Create an engaging YouTube video script about "${topic}" that will be approximately ${minutes} minutes and ${seconds} seconds long (around ${targetWords} words).

Requirements:
- Structure the script with clear sections (Introduction, Main Content, Conclusion)
- Write in a conversational, engaging tone suitable for YouTube
- Include hooks to keep viewers watching
- Add natural pauses and transitions
- Make it educational and informative
- Include call-to-actions (like, subscribe, comment)
- Ensure content is accurate and well-researched
- Write in a way that's easy to speak aloud

Format the response as follows:
[INTRODUCTION]
(Hook and introduction content)

[MAIN_CONTENT]
(Main educational content broken into logical sections)

[CONCLUSION]
(Summary and call-to-action)

Please write the complete script now:`;
  }

  /**
   * Parse script content into structured format
   */
  private parseScriptContent(content: string, topic: string, targetDuration: number): Script {
    const scriptId = uuidv4();
    const sections: ScriptSection[] = [];
    
    // Split content by sections
    const sectionRegex = /\[(.*?)\]([\s\S]*?)(?=\[|$)/g;
    let match;
    let currentTime = 0;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      const sectionTitle = match[1].trim();
      const sectionContent = match[2].trim();
      
      if (sectionContent) {
        const words = sectionContent.split(/\s+/).length;
        const sectionDuration = Math.floor((words / 150) * 60); // 150 words per minute
        
        sections.push({
          id: uuidv4(),
          title: sectionTitle,
          content: sectionContent,
          startTime: currentTime,
          duration: sectionDuration,
        });
        
        currentTime += sectionDuration;
      }
    }

    // If no sections found, treat entire content as one section
    if (sections.length === 0) {
      const words = content.split(/\s+/).length;
      const duration = Math.floor((words / 150) * 60);
      
      sections.push({
        id: uuidv4(),
        title: 'Main Content',
        content: content.trim(),
        startTime: 0,
        duration,
      });
      
      currentTime = duration;
    }

    return {
      id: scriptId,
      topic,
      content: content.trim(),
      estimatedDuration: currentTime,
      sections,
    };
  }

  /**
   * Generate multiple script variations
   */
  async generateScriptVariations(topic: string, duration: number, count: number = 3): Promise<Script[]> {
    try {
      if (count < 1 || count > 5) {
        throw new ValidationError('Count must be between 1 and 5');
      }

      logger.info('Generating script variations', { topic, duration, count });

      const promises = Array.from({ length: count }, (_, index) => 
        this.generateScript(`${topic} (variation ${index + 1})`, duration)
      );

      const scripts = await Promise.all(promises);
      
      logger.info('Script variations generated successfully', { 
        topic, 
        count: scripts.length 
      });

      return scripts;
    } catch (error) {
      logger.error('Script variations generation failed', error as Error, { topic, duration, count });
      throw error;
    }
  }

  /**
   * Analyze topic and suggest improvements
   */
  async analyzeTopic(topic: string): Promise<{
    suggestions: string[];
    keywords: string[];
    estimatedPopularity: 'low' | 'medium' | 'high';
    recommendedDuration: number;
  }> {
    try {
      if (!topic || topic.trim().length === 0) {
        throw new ValidationError('Topic is required');
      }

      const prompt = `
Analyze the following YouTube video topic and provide insights:
Topic: "${topic}"

Please provide:
1. 3-5 suggestions to make this topic more engaging and clickable
2. 5-10 relevant keywords for SEO
3. Estimated popularity (low/medium/high) based on current trends
4. Recommended video duration in seconds (between 300-900 seconds)

Format your response as JSON:
{
  "suggestions": ["suggestion1", "suggestion2", ...],
  "keywords": ["keyword1", "keyword2", ...],
  "estimatedPopularity": "medium",
  "recommendedDuration": 600
}`;

      const completion = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          {
            role: 'system',
            content: 'You are a YouTube content strategy expert who analyzes topics and provides actionable insights for content creators.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      });

      const analysisContent = completion.choices[0]?.message?.content;
      if (!analysisContent) {
        throw new ExternalServiceError('OpenAI', 'No analysis generated');
      }

      try {
        const analysis = JSON.parse(analysisContent);
        
        logger.info('Topic analysis completed', { topic, analysis });
        
        return {
          suggestions: analysis.suggestions || [],
          keywords: analysis.keywords || [],
          estimatedPopularity: analysis.estimatedPopularity || 'medium',
          recommendedDuration: analysis.recommendedDuration || 600,
        };
      } catch (parseError) {
        logger.warn('Failed to parse analysis JSON, using fallback', { analysisContent });
        
        return {
          suggestions: ['Make the title more specific', 'Add trending keywords', 'Include numbers or statistics'],
          keywords: topic.split(' ').filter(word => word.length > 3),
          estimatedPopularity: 'medium',
          recommendedDuration: 600,
        };
      }
    } catch (error) {
      logger.error('Topic analysis failed', error as Error, { topic });
      
      if (error instanceof ValidationError) {
        throw error;
      }
      
      throw new ExternalServiceError('OpenAI', `Topic analysis failed: ${(error as Error).message}`);
    }
  }
}

export const contentGenerationService = new AIContentGenerationService();