-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    script JSONB,
    audio_file VARCHAR(500),
    video_file VARCHAR(500),
    thumbnail_file VARCHAR(500),
    youtube_video_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN (
        'draft', 'script_generating', 'script_ready', 'audio_generating', 
        'audio_ready', 'visuals_processing', 'video_editing', 'video_ready',
        'thumbnail_generating', 'uploading', 'published', 'failed'
    )),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_videos_project_id ON videos(project_id);
CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status);
CREATE INDEX IF NOT EXISTS idx_videos_youtube_id ON videos(youtube_video_id);
CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at);

-- Create trigger for videos table
CREATE TRIGGER update_videos_updated_at 
    BEFORE UPDATE ON videos 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();