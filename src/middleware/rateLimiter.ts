import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { config } from '@/config/unifiedConfig';

let redis: Redis | null = null;

if (config.upstash.redisRestUrl && config.upstash.redisRestToken) {
  redis = new Redis({
    url: config.upstash.redisRestUrl,
    token: config.upstash.redisRestToken,
  });
}

// Global fallback memory cache if Redis is not configured
const fallbackCache = new Map();

/**
 * Creates a standard IP-based rate limiter using Upstash.
 * Uses a sliding window by default.
 * @param requests Number of allowed requests
 * @param window Window duration e.g. "10 s", "1 m"
 */
export const getRateLimiter = (requests: number, window: `${number} ms` | `${number} s` | `${number} m` | `${number} h` | `${number} d` = "10 s") => {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, window),
      analytics: true,
      prefix: '@upstash/ratelimit',
    });
  }

  // Fallback in-memory rate limiter (useful for local development without Redis)
  return {
    limit: async (identifier: string) => {
      const now = Date.now();
      // Parse window to ms roughly (only handles s, m currently for fallback)
      let windowMs = 10000;
      if (window.endsWith(' s')) windowMs = parseInt(window) * 1000;
      if (window.endsWith(' m')) windowMs = parseInt(window) * 60 * 1000;

      const record = fallbackCache.get(identifier) || { count: 0, resetTime: now + windowMs };
      
      if (now > record.resetTime) {
        record.count = 1;
        record.resetTime = now + windowMs;
      } else {
        record.count += 1;
      }
      
      fallbackCache.set(identifier, record);
      
      return {
        success: record.count <= requests,
        limit: requests,
        remaining: Math.max(0, requests - record.count),
        reset: record.resetTime
      };
    }
  };
};

// Common limiters
export const apiLimiter = getRateLimiter(20, "10 s"); // 20 requests per 10 seconds
export const authLimiter = getRateLimiter(5, "1 m"); // 5 requests per minute for auth routes
