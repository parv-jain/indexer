import Redis from "ioredis";
import { config } from "@/config/index";

// Only API workers needs to connect to the rate limiter
export const rateLimitRedis = new Redis(config.rateLimitRedisUrl, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
  enableOfflineQueue: false,
  commandTimeout: 1000,
});
