import { Redis } from "@upstash/redis";

// Lazy initialization of Redis client
let redisClient: Redis | null = null;

function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || url === "your_upstash_redis_rest_url") {
      throw new Error(
        "UPSTASH_REDIS_REST_URL is not properly configured in environment variables. " +
        "Please set it to your actual Upstash Redis REST URL from https://console.upstash.com/"
      );
    }

    if (!token || token === "your_upstash_redis_rest_token") {
      throw new Error(
        "UPSTASH_REDIS_REST_TOKEN is not properly configured in environment variables. " +
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
