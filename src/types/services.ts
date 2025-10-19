import { 
  Script, 
  AudioFile, 
  VideoFile, 
  ImageFile, 
  VisualContent, 
  VideoMetadata, 
  VoiceConfig, 
  ThumbnailStyle,
  YouTubeUploadResult,
  YouTubeVideoStats,
  VideoProductionTask,
  TaskStatus,
  SystemError,
  ErrorContext
} from './index';

// Service Interfaces
export interface ContentGenerationService {
  generateScript(topic: string, duration: number): Promise<Script>;
  generateSpeech(script: Script, voice: VoiceConfig): Promise<AudioFile>;
  optimizeContent(content: string, targetDuration: number): Promise<string>;
}

export interface VideoProductionService {
  findVisualContent(topic: string, duration: number): Promise<VisualContent[]>;
  createVideo(audio: AudioFile, visuals: VisualContent[]): Promise<VideoFile>;
  generateThumbnail(topic: string, style: ThumbnailStyle): Promise<ImageFile>;
}

export interface YouTubeUploadService {
  uploadVideo(video: VideoFile, metadata: VideoMetadata): Promise<YouTubeUploadResult>;
  updateVideoStatus(videoId: string, status: string): Promise<void>;
  getVideoStats(videoId: string): Promise<YouTubeVideoStats>;
}

export interface TaskQueueManager {
  addTask(task: VideoProductionTask): Promise<string>;
  getTaskStatus(taskId: string): Promise<TaskStatus>;
  processQueue(): Promise<void>;
  retryFailedTasks(): Promise<void>;
}

export interface AuthenticationService {
  authenticateWithYouTube(code: string): Promise<{ accessToken: string; refreshToken: string }>;
  refreshAccessToken(refreshToken: string): Promise<string>;
  validateToken(token: string): Promise<boolean>;
  revokeAccess(userId: string): Promise<void>;
}

export interface ErrorHandler {
  handleError(error: SystemError): Promise<void>;
  retryOperation<T>(operation: () => Promise<T>, maxRetries: number): Promise<T>;
  logError(error: Error, context: ErrorContext): void;
}

export interface FileStorageService {
  uploadFile(file: Buffer, filename: string, contentType: string): Promise<string>;
  downloadFile(path: string): Promise<Buffer>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string): string;
}

export interface DatabaseService {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  query<T>(sql: string, params?: any[]): Promise<T[]>;
  transaction<T>(callback: (client: any) => Promise<T>): Promise<T>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface NotificationService {
  sendEmail(to: string, subject: string, body: string): Promise<void>;
  sendWebSocketMessage(userId: string, message: any): Promise<void>;
  broadcastMessage(message: any): Promise<void>;
}

// Repository Interfaces
export interface UserRepository {
  create(user: Omit<import('./index').User, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('./index').User>;
  findById(id: string): Promise<import('./index').User | null>;
  findByEmail(email: string): Promise<import('./index').User | null>;
  update(id: string, updates: Partial<import('./index').User>): Promise<import('./index').User>;
  delete(id: string): Promise<void>;
}

export interface ProjectRepository {
  create(project: Omit<import('./index').Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('./index').Project>;
  findById(id: string): Promise<import('./index').Project | null>;
  findByUserId(userId: string): Promise<import('./index').Project[]>;
  update(id: string, updates: Partial<import('./index').Project>): Promise<import('./index').Project>;
  delete(id: string): Promise<void>;
}

export interface VideoRepository {
  create(video: Omit<import('./index').Video, 'id' | 'createdAt' | 'updatedAt'>): Promise<import('./index').Video>;
  findById(id: string): Promise<import('./index').Video | null>;
  findByProjectId(projectId: string): Promise<import('./index').Video[]>;
  update(id: string, updates: Partial<import('./index').Video>): Promise<import('./index').Video>;
  delete(id: string): Promise<void>;
  findByStatus(status: import('./index').VideoStatus): Promise<import('./index').Video[]>;
}