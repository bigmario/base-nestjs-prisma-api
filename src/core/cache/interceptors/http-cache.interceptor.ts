import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of, tap } from 'rxjs';

import { RedisCacheService } from '@core/cache/redis-cache.service';
import {
  CACHE_TTL_KEY,
  CACHE_KEY_PREFIX,
  CACHE_EVICT_PREFIXES,
} from '@core/cache/decorators/cache.decorators';

/** Default TTL: 5 minutes (in milliseconds, cache-manager v6). */
const DEFAULT_TTL_MS = 300_000;

/**
 * Interceptor that handles both **reading** (cache-aside on GET) and
 * **eviction** (invalidation after mutations) based on the custom
 * `@Cacheable` and `@CacheEvict` decorators.
 *
 * - On GET handlers decorated with `@Cacheable`: looks up the cache
 *   first; on a miss it executes the handler and stores the result.
 * - On mutation handlers decorated with `@CacheEvict`: executes the
 *   handler first, then evicts the specified prefix groups.
 *
 * Resilience: any Redis failure is caught internally; the request
 * always reaches the handler so the API never breaks because of cache.
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: RedisCacheService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    // ── Eviction path ────────────────────────────────────────
    const evictPrefixes = this.reflector.get<string[]>(
      CACHE_EVICT_PREFIXES,
      context.getHandler(),
    );

    if (evictPrefixes && evictPrefixes.length > 0) {
      return next.handle().pipe(
        tap((/* response */) => {
          void (async () => {
            for (const prefix of evictPrefixes) {
              await this.cacheService.delByPrefix(prefix);
            }
          })();
        }),
      );
    }

    // ── Cache-aside path (GET) ───────────────────────────────
    const keyPrefix = this.reflector.get<string>(
      CACHE_KEY_PREFIX,
      context.getHandler(),
    );

    if (!keyPrefix) {
      // No cache decorator → pass through
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const cacheKey = this.buildCacheKey(keyPrefix, request);

    const ttl =
      this.reflector.get<number>(CACHE_TTL_KEY, context.getHandler()) ??
      DEFAULT_TTL_MS;

    try {
      const cached = await this.cacheService.get<unknown>(cacheKey);
      if (cached !== undefined && cached !== null) {
        return of(cached);
      }
    } catch {
      // Redis unavailable – proceed to handler
    }

    return next.handle().pipe(
      tap((response) => {
        void this.cacheService.setWithPrefix(
          keyPrefix,
          cacheKey,
          response,
          ttl,
        );
      }),
    );
  }

  /**
   * Build a deterministic cache key from the prefix and request
   * query parameters / route params.
   *
   * Examples:
   *   prefix = 'api:user:list'  →  'api:user:list:page=1&limit=10'
   *   prefix = 'api:user:item'  →  'api:user:item:42'
   */
  private buildCacheKey(prefix: string, request: any): string {
    const params = request.params;
    const query = request.query;

    // If the route has a named param (e.g. /:id), append it
    if (params && params.id) {
      return `${prefix}:${params.id}`;
    }

    // For list endpoints, serialise query params sorted alphabetically
    if (query && Object.keys(query).length > 0) {
      const sortedQuery = Object.keys(query)
        .sort()
        .map((k) => `${k}=${query[k]}`)
        .join('&');
      return `${prefix}:${sortedQuery}`;
    }

    return prefix;
  }
}
