import Redis from "ioredis";
import { env } from "../config/env";

export const redisPublisher = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  lazyConnect: true,
  maxRetriesPerRequest: 2
});

export const redisSubscriber = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  lazyConnect: true,
  maxRetriesPerRequest: 2
});
