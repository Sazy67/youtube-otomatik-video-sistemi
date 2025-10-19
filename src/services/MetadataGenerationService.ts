import OpenAI from 'openai';
import { VideoMetadata } from '../types';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ExternalServiceError, ValidationError } from '../utils/errors';

export class MetadataGenerationService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
  }

  async generateMetadata(topic: string, script?: string): Promise<VideoMetadata> {
    try {
      logger.info('Generating SEO metadata', { topic });

      const [title, description, tags] = await Promise.all([
        this.generateTitle(topic),
        this.generateDescription(topic, script),
        this.generateTags(topic)
      ]);

      const metadata: VideoMetadata = {
        title,
        description,
        tags,
        category: '27', // Education
        privacy: 'private'
      };

      logger.info('Metadata generated successfully', { title, tagCount: tags.length });
      return metadata;
    } catch (error) {
      logger.error('Metadata generation failed', error as Error, { topic });
      throw error;
    }
  }

  private async generateTitle(topic: string): Promise<string> {
    const prompt = `Create a compelling YouTube video title for: "${topic}". 
    Requirements: Under 60 characters, clickable, SEO-friendly, includes keywords.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7
    });

    return completion.choices[0]?.message?.content?.trim() || topic;
  }

  private async generateDescription(topic: string, script?: string): Promise<string> {
    const content = script ? script.substring(0, 1000) : topic;
    const prompt = `Create a YouTube video description for: "${topic}". 
    Include: Summary, timestamps, call-to-action, relevant hashtags. Max 500 words.
    Content preview: ${content}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 800,
      temperature: 0.6
    });

    return completion.choices[0]?.message?.content?.trim() || `Learn about ${topic} in this educational video.`;
  }

  private async generateTags(topic: string): Promise<string[]> {
    const prompt = `Generate 10-15 YouTube tags for: "${topic}". 
    Include: Main keywords, related terms, trending hashtags. Return as comma-separated list.`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 200,
      temperature: 0.5
    });

    const tagsText = completion.choices[0]?.message?.content?.trim() || topic;
    return tagsText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0).slice(0, 15);
  }
}

export const metadataGenerationService = new MetadataGenerationService();