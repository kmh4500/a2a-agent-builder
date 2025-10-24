# Docker Deployment Guide

## Quick Start

1. **Copy environment template**
   ```bash
   cp .env.docker.example .env.docker
   ```

2. **Edit `.env.docker` file with your configuration**
   ```bash
   # Required: LLM API credentials
   LLM_API_URL=https://your-llm-api-url/v1/chat/completions
   LLM_MODEL=/path/to/your/model
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - Application: http://localhost:3001
   - Redis: localhost:6379

## Environment Variables

### Required
- `LLM_API_URL`: Your LLM API endpoint URL
- `LLM_MODEL`: Path to your LLM model

### Optional
- `PORT`: Application port (default: 3001)
- `NEXT_PUBLIC_SITE_URL`: Public URL for the application
- `NODE_TLS_REJECT_UNAUTHORIZED`: Set to 0 for self-signed certificates

### Automatic (managed by docker-compose)
- `REDIS_URL`: Automatically set to `redis://redis:6379`

## Commands

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild and start
docker-compose up -d --build

# Stop and remove volumes (data will be lost)
docker-compose down -v
```

## Architecture

- **app**: Next.js application (port 3001)
- **redis**: Redis database (port 6379)
- **redis-data**: Persistent volume for Redis data

## Notes

- Redis data is persisted in a Docker volume
- The application automatically connects to Redis using `REDIS_URL`
- Environment variables are loaded from `.env.docker` file (not committed to git)
- Copy `.env.docker.example` to `.env.docker` and configure before starting
