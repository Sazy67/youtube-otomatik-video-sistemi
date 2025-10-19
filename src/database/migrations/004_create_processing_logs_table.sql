-- Create processing_logs table for tracking video processing steps
CREATE TABLE IF NOT EXISTS processing_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    step_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_processing_logs_video_id ON processing_logs(video_id);
CREATE INDEX IF NOT EXISTS idx_processing_logs_status ON processing_logs(status);
CREATE INDEX IF NOT EXISTS idx_processing_logs_created_at ON processing_logs(created_at);