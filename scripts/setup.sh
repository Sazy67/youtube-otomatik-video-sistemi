#!/bin/bash

# YouTube Automation System Setup Script

set -e

echo "🚀 Setting up YouTube Automation System..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p uploads temp logs ssl

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your API keys and configuration"
fi

# Build and start services
echo "🔨 Building Docker containers..."
docker-compose build

echo "🚀 Starting services..."
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec app npm run db:migrate || echo "⚠️  Migration failed - database might already be initialized"

echo "✅ Setup complete!"
echo ""
echo "🌐 Application is running at: http://localhost:3000"
echo "📊 Health check: http://localhost:3000/health"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your API keys"
echo "2. Restart services: docker-compose restart"
echo "3. Check logs: docker-compose logs -f"
echo ""
echo "🛑 To stop: docker-compose down"