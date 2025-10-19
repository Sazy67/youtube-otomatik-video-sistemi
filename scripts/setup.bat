@echo off
echo 🚀 Setting up YouTube Automation System...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Desktop first.
    pause
    exit /b 1
)

REM Create necessary directories
echo 📁 Creating directories...
if not exist "uploads" mkdir uploads
if not exist "temp" mkdir temp
if not exist "logs" mkdir logs
if not exist "ssl" mkdir ssl

REM Copy environment file if it doesn't exist
if not exist ".env" (
    echo 📝 Creating .env file from template...
    copy .env.example .env
    echo ⚠️  Please edit .env file with your API keys and configuration
)

REM Build and start services
echo 🔨 Building Docker containers...
docker-compose build

echo 🚀 Starting services...
docker-compose up -d

REM Wait for database to be ready
echo ⏳ Waiting for database to be ready...
timeout /t 10 /nobreak >nul

REM Run database migrations
echo 🗄️  Running database migrations...
docker-compose exec app npm run db:migrate

echo ✅ Setup complete!
echo.
echo 🌐 Application is running at: http://localhost:3000
echo 📊 Health check: http://localhost:3000/health
echo.
echo 📋 Next steps:
echo 1. Edit .env file with your API keys
echo 2. Restart services: docker-compose restart
echo 3. Check logs: docker-compose logs -f
echo.
echo 🛑 To stop: docker-compose down
pause