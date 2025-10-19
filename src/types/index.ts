// Core Data Models
export interface User {
  id: string;
  email: string;
  youtubeChannelId?: string;
  accessToken?: string;
  refreshToken?: string;
  preferences: UserPreferences;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  defaultVoice: string;
  defaultCategory: string;
  defaultPrivacy: 'public' | 'private' | 'unlisted';
  videoStyle: 'educational' | 'entertainment' | 'news';
  thumbnailStyle: 'minimal' | 'colorful' | 'professional';
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  topics: string[];
  status: 'draft' | 'processing' | 'completed' | 'failed';
  videos: Video[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Video {
  id: string;
  projectId: string;
  topic: string;
  script?: Script;
  audioFile?: string;
  videoFile?: string;
  thumbnailFile?: string;
  youtubeVideoId?: string;
  status: VideoStatus;
  metadata: VideoMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface Script {
  id: string;
  topic: string;
  content: string;
  estimatedDuration: number;
  sections: ScriptSection[];
}

export interface ScriptSection {
  id: string;
  title: string;
  content: string;
  startTime: number;
  duration: number;
}

export interface VideoMetadata {
  title: string;
  description: string;
  tags: string[];
  category: string;
  thumbnail?: string;
  privacy: 'public' | 'private' | 'unlisted';
}

export interface VisualContent {
  type: 'image' | 'video' | 'animation';
  source: string;
  duration: number;
  startTime: number;
  url?: string;
}

// Processing Pipeline Types
export interface ProcessingPipeline {
  videoId: string;
  steps: PipelineStep[];
  currentStep: number;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
}

export interface PipelineStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  error?: string;
  progress?: number;
}

export interface VideoProductionTask {
  id: string;
  userId: string;
  topic: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Status Enums
export type VideoStatus = 
  | 'draft'
  | 'script_generating'
  | 'script_ready'
  | 'audio_generating'
  | 'audio_ready'
  | 'visuals_processing'
  | 'video_editing'
  | 'video_ready'
  | 'thumbnail_generating'
  | 'uploading'
  | 'published'
  | 'failed';

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';

// Configuration Types
export interface VoiceConfig {
  provider: 'elevenlabs' | 'azure' | 'google';
  voiceId: string;
  speed: number;
  pitch: number;
  volume: number;
}

export interface ThumbnailStyle {
  template: 'minimal' | 'colorful' | 'professional';
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  overlayOpacity: number;
}

// Error Types
export interface SystemError {
  code: string;
  message: string;
  category: 'user' | 'external' | 'system';
  retryable: boolean;
  context: any;
}

export interface ErrorContext {
  userId?: string;
  videoId?: string;
  taskId?: string;
  service: string;
  operation: string;
  timestamp: Date;
}

// File Types
export interface AudioFile {
  id: string;
  filename: string;
  path: string;
  duration: number;
  format: string;
  size: number;
}

export interface VideoFile {
  id: string;
  filename: string;
  path: string;
  duration: number;
  format: string;
  resolution: string;
  size: number;
}

export interface ImageFile {
  id: string;
  filename: string;
  path: string;
  format: string;
  width: number;
  height: number;
  size: number;
}

// YouTube API Types
export interface YouTubeUploadResult {
  videoId: string;
  status: string;
  uploadStatus: string;
  privacyStatus: string;
  publishAt?: string;
}

export interface YouTubeVideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  publishedAt: string;
}

// External API Response Types
export interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ElevenLabsResponse {
  audio: Buffer;
  contentType: string;
}

export interface UnsplashResponse {
  results: Array<{
    id: string;
    urls: {
      regular: string;
      small: string;
      thumb: string;
    };
    description: string;
    alt_description: string;
  }>;
}