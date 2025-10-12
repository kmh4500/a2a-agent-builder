import { Redis } from "@upstash/redis";

// Lazy initialization of Redis client
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;

    if (!url || url === "your_kv_rest_api_url") {
      throw new Error(
        "KV_REST_API_URL is not properly configured in environment variables. " +
        "Please set it to your actual Upstash Redis REST URL from https://console.upstash.com/"
      );
    }

    if (!token || token === "your_kv_rest_api_token") {
      throw new Error(
        "KV_REST_API_TOKEN is not properly configured in environment variables. " +
        "Please set it to your actual Upstash Redis REST token from https://console.upstash.com/"
      );
    }

    redisClient = new Redis({ url, token });
  }

  return redisClient;
}

// Export a proxy object that lazily initializes the Redis client
export const redis = new Proxy({} as Redis, {
  get(target, prop) {
    const client = getRedisClient();
    const value = client[prop as keyof Redis];
    return typeof value === 'function' ? value.bind(client) : value;
  }
});

// Key prefixes for organization
export const REDIS_KEYS = {
  AGENT: (agentId: string) => `agent:${agentId}`,
  AGENT_LIST: "agents:list",
} as const;
