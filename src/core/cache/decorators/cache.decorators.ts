import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by `HttpCacheInterceptor` to read TTL from the
 * handler or controller.
 */
export const CACHE_TTL_KEY = 'cache_ttl';

/**
 * Metadata key used by `HttpCacheInterceptor` to read the key prefix
 * from the handler or controller.
 */
export const CACHE_KEY_PREFIX = 'cache_key_prefix';

/**
 * Metadata key used by `CacheEvictInterceptor` to read which
 * prefix groups must be evicted after a successful mutation.
 */
export const CACHE_EVICT_PREFIXES = 'cache_evict_prefixes';

/**
 * Mark a GET handler as cacheable.
 *
 * @param options.ttl       Time-to-live in **milliseconds**.
 * @param options.keyPrefix Prefix for the cache key (e.g. `'api:user:list'`).
 *
 * @example
 * ```ts
 * @Cacheable({ keyPrefix: 'api:user:roles', ttl: 3_600_000 })
 * @Get('/roles')
 * getAllRoles() { ... }
 * ```
 */
export function Cacheable(options: { keyPrefix: string; ttl?: number }) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    SetMetadata(CACHE_KEY_PREFIX, options.keyPrefix)(
      target,
      propertyKey,
      descriptor,
    );
    if (options.ttl !== undefined) {
      SetMetadata(CACHE_TTL_KEY, options.ttl)(target, propertyKey, descriptor);
    }
    return descriptor;
  };
}

/**
 * Mark a mutation handler to evict cache entries by prefix after
 * successful execution.
 *
 * @param prefixes One or more prefix groups to invalidate.
 *
 * @example
 * ```ts
 * @CacheEvict(['api:user:list', 'api:user:item'])
 * @Post()
 * createUser() { ... }
 * ```
 */
export function CacheEvict(prefixes: string[]) {
  return SetMetadata(CACHE_EVICT_PREFIXES, prefixes);
}
