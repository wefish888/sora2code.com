#!/bin/bash

# sora2code Backend Deployment Script
# Usage: ./deploy.sh [environment]
# Environment: production (default), staging

set -e  # Exit on any error

ENVIRONMENT=${1:-production}
PROJECT_NAME="sora2code"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

echo "🚀 Starting sora2code Backend Deployment..."
echo "Environment: $ENVIRONMENT"
echo "Timestamp: $(date)"

# Create necessary directories
mkdir -p data logs ssl $BACKUP_DIR

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# Function to backup database
backup_database() {
    if [ -f "./data/production.db" ]; then
        log "📦 Creating database backup..."
        cp "./data/production.db" "$BACKUP_DIR/production-$(date +%Y%m%d-%H%M%S).db"
        log "✅ Database backup created"
    fi
}

# Function to check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."

    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        log "❌ Docker is not installed"
        exit 1
    fi

    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null; then
        log "❌ Docker Compose is not installed"
        exit 1
    fi

    # Check if .env.production exists
    if [ ! -f ".env.production" ]; then
        log "❌ .env.production file not found"
        log "Please create .env.production with your production configuration"
        exit 1
    fi

    log "✅ Prerequisites check passed"
}

# Function to build and deploy
deploy() {
    log "🏗️ Building application..."

    # Build Docker image
    docker-compose build --no-cache

    log "📋 Running database migrations..."

    # Run database migrations in a temporary container
    docker-compose run --rm sora2code-api npm run db:deploy

    log "🚀 Starting services..."

    # Stop existing services
    docker-compose down

    # Start services
    docker-compose up -d

    log "⏱️ Waiting for services to start..."
    sleep 30

    # Health check
    if curl -f http://localhost:3000/health > /dev/null 2>&1; then
        log "✅ Health check passed"
    else
        log "❌ Health check failed"
        log "🔍 Checking logs..."
        docker-compose logs sora2code-api
        exit 1
    fi
}

# Function to cleanup old backups
cleanup_backups() {
    log "🧹 Cleaning up old backups..."
    find $BACKUP_DIR -name "production-*.db" -mtime +7 -delete
    log "✅ Cleanup completed"
}

# Main deployment process
main() {
    log "🎯 Starting deployment process..."

    check_prerequisites
    backup_database
    deploy
    cleanup_backups

    log "🎉 Deployment completed successfully!"
    log "🌐 API is running at: http://localhost:3000"
    log "📊 Health check: http://localhost:3000/health"
    log "📋 View logs: docker-compose logs -f"

    echo ""
    echo "🔧 Useful commands:"
    echo "  View logs:     docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart:       docker-compose restart"
    echo "  Shell access:  docker-compose exec sora2code-api sh"
}

# Run main function
main

log "✅ Deployment script completed"