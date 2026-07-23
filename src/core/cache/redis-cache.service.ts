import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

/**
 * Resilient Redis Cache Service.
 *
 * Wraps `cache-manager` operations with try-catch to guarantee
 * the application never crashes when Redis is unavailable.
 * Every public method degrades gracefully: on failure it logs a
 * warning and returns a safe default so callers can fall through
 * to the database transparently.
 */
@Injectable()
export class RedisCacheService {
  private readonly logger = new Logger(RedisCacheService.name);

  constructor(
    @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
  ) {}

  /**
   * Retrieve a value from cache.
   * Returns `undefined` when Redis is unavailable or the key does not exist.
   */
  async get<T>(key: string): Promise<T | undefined> {
    try {
      if (!this.cache) return undefined;
      const value = await this.withTimeout(this.cache.get<T>(key));
      if (value !== undefined && value !== null) {
        this.logger.debug(`Cache HIT  → ${key}`);
      } else {
        this.logger.debug(`Cache MISS → ${key}`);
      }
      return value;
    } catch (error) {
      this.logger.warn(
        `Redis GET failed for key "${key}", falling back to DB: ${error.message}`,
      );
      return undefined;
    }
  }

  /**
   * Store a value in cache.
   * @param key   Cache key
   * @param value Value to store
   * @param ttl   Time-to-live in **milliseconds** (cache-manager v6 uses ms)
   */
  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    try {
      if (!this.cache) return;
      await this.withTimeout(this.cache.set(key, value, ttl));
      this.logger.debug(`Cache SET  → ${key} (ttl=${ttl ?? 'default'}ms)`);
    } catch (error) {
      this.logger.warn(`Redis SET failed for key "${key}": ${error.message}`);
    }
  }

  /**
   * Delete a single key from cache.
   */
  async del(key: string): Promise<void> {
    try {
      if (!this.cache) return;
      await this.withTimeout(this.cache.del(key));
      this.logger.debug(`Cache DEL  → ${key}`);
    } catch (error) {
      this.logger.warn(`Redis DEL failed for key "${key}": ${error.message}`);
    }
  }

  /**
   * Delete all keys matching a given prefix.
   *
   * Because `cache-manager` v6 with Keyv does not expose a native
   * `keys()` / `SCAN` command, we maintain an internal registry
   * of keys per prefix group.  When a key is SET via `setWithPrefix`,
   * we track it so it can be invalidated later by `delByPrefix`.
   *
   * For simple prefix-based eviction this is sufficient; for very
   * large-scale workloads, a direct `ioredis` SCAN could be added.
   */
  async delByPrefix(prefix: string): Promise<void> {
    try {
      if (!this.cache) return;
      const registryKey = this.buildRegistryKey(prefix);
      const keys = await this.get<string[]>(registryKey);
      if (keys && keys.length > 0) {
        for (const key of keys) {
          await this.cache.del(key);
        }
        await this.cache.del(registryKey);
        this.logger.debug(
          `Cache DEL BY PREFIX → "${prefix}" (${keys.length} keys evicted)`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Redis DEL BY PREFIX failed for "${prefix}": ${error.message}`,
      );
    }
  }

  /**
   * Store a value in cache and register the key under its prefix
   * group so it can be bulk-invalidated later with `delByPrefix`.
   */
  async setWithPrefix(
    prefix: string,
    key: string,
    value: unknown,
    ttl?: number,
  ): Promise<void> {
    await this.set(key, value, ttl);
    await this.registerKey(prefix, key);
  }

  /**
   * Reset the entire cache store.
   *
   * Note: cache-manager v6 with Keyv does not expose a `reset()` method.
   * This method serves as a placeholder. For full cache flush, use
   * Redis CLI `FLUSHDB` or a direct ioredis client.
   */
  async reset(): Promise<void> {
    try {
      if (!this.cache) return;
      // cache-manager v6 does not provide a reset/clear method;
      // we rely on prefix-based eviction via delByPrefix instead.
      this.logger.debug(
        'Cache RESET requested — use delByPrefix or Redis CLI FLUSHDB for full flush',
      );
    } catch (error) {
      this.logger.warn(`Redis RESET failed: ${error.message}`);
    }
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs = 200,
  ): Promise<T | undefined> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<undefined>((resolve) => {
      timer = setTimeout(() => resolve(undefined), timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer);
      return result;
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  }

  private buildRegistryKey(prefix: string): string {
    return `__registry__:${prefix}`;
  }

  private async registerKey(prefix: string, key: string): Promise<void> {
    try {
      if (!this.cache) return;
      const registryKey = this.buildRegistryKey(prefix);
      const existing = (await this.cache.get<string[]>(registryKey)) || [];
      if (!existing.includes(key)) {
        existing.push(key);
        // Registry never expires; it is deleted when the prefix is evicted
        await this.cache.set(registryKey, existing, 0);
      }
    } catch (error) {
      this.logger.warn(
        `Redis key registration failed for prefix "${prefix}": ${error.message}`,
      );
    }
  }
}
