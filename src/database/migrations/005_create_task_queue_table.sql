-- Create task_queue table for tracking background jobs
CREATE TABLE IF NOT EXISTS task_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
    task_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    payload JSONB DEFAULT '{}',
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_queue_status ON task_queue(status);
CREATE INDEX IF NOT EXISTS idx_task_queue_scheduled_at ON task_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_task_queue_user_id ON task_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_video_id ON task_queue(video_id);
CREATE INDEX IF NOT EXISTS idx_task_queue_priority ON task_queue(priority DESC);