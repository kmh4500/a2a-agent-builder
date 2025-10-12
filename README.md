# A2A Agent Builder

A platform for building and deploying AI agents using the Agent-to-Agent (A2A) protocol. Create custom agents with different AI models and deploy them as A2A-compatible services.

## Features

- Build custom AI agents with simple configuration
- Support for multiple AI model providers (Gemini, etc.)
- Agent-to-Agent (A2A) protocol support
- Persistent agent storage with Upstash Redis
- Real-time streaming responses
- Dynamic agent deployment and management

## Getting Started

### Prerequisites

- Node.js 22+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- Gemini API key (from [Google AI Studio](https://makersuite.google.com/app/apikey))
- Upstash Redis account (free tier available at [Upstash Console](https://console.upstash.com/))

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd a2a-agent-builder
```

2. Install Node.js 22 (if using nvm):
```bash
nvm use 22
# or if not installed yet:
# nvm install 22
```

3. Install dependencies:
```bash
npm install
```

4. Set up environment variables:
```bash
cp .env.example .env
```

5. Configure your `.env` file with the following:

```bash
# Gemini API Key (get from https://makersuite.google.com/app/apikey)
GEMINI_API_KEY=your_gemini_api_key_here

# Next.js Configuration
NEXT_PUBLIC_SITE_URL=http://localhost:3001
PORT=3001

# Upstash Redis Configuration (get from https://console.upstash.com/)
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

### Setting up Upstash Redis

1. Go to [Upstash Console](https://console.upstash.com/)
2. Sign up or log in to your account
3. Click "Create Database"
4. Choose a name for your database
5. Select a region close to your deployment
6. Click "Create"
7. Copy the "REST URL" and "REST Token" from the database details page
8. Add these values to your `.env` file

### Testing Redis Connection

Before running the development server, test your Upstash Redis connection:

```bash
npx tsx scripts/test-redis.ts
```

This will verify that:
- Redis connection is working
- SET/GET operations are functional
- Agent storage patterns work correctly

### Development

Run the development server:
```bash
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) in your browser.

## API Endpoints

### Agent Management
- `GET /api/agents/list` - List all deployed agents
- `POST /api/generate-agent` - Generate a new agent configuration
- `POST /api/deploy-agent` - Deploy an agent

### Agent Execution
- `GET /api/agents/[agentId]/.well-known/agent.json` - Get agent card (A2A protocol)
- `POST /api/agents/[agentId]` - Execute agent tasks (A2A protocol)
- `POST /api/agents/[agentId]/deploy` - Deploy a specific agent

## Architecture

This project uses:
- **Next.js 15** - React framework with App Router
- **Google Gemini AI** - For natural language processing
- **Agent-to-Agent (A2A) Protocol** - For inter-agent communication
- **Upstash Redis** - For persistent agent storage
- **TypeScript** - For type safety

## Agent Storage

Agents are stored in Upstash Redis with the following structure:

- `agent:{agentId}` - Stores agent configuration (card, prompt, model settings)
- `agents:list` - Set of all agent IDs

Note: Runtime handlers (executor, requestHandler, transportHandler) are recreated on-demand and not stored in Redis.

## Deployment

This project is configured for deployment on Vercel or any Node.js hosting platform.

Set the following environment variables in your deployment:

- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `PORT`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

## Troubleshooting

### Redis Connection Issues

If you see errors related to Redis:
1. Verify your `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct
2. Check that your Upstash Redis database is active
3. Ensure your IP is not blocked (Upstash free tier has some restrictions)

### Agent Not Found

If agents are not persisting:
1. Check that Redis is properly configured
2. Verify the agent was successfully deployed
3. Check the server logs for any errors

## License

MIT
