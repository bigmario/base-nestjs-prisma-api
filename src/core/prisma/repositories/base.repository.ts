import { Injectable, Optional } from '@nestjs/common';

import { PaginationService } from '@core/pagination/services/pagination.service';
import { RedisCacheService } from '@core/cache/redis-cache.service';
import { FindAllOptions } from '@core/types/find-all.types';

/** Options to configure caching behaviour on a repository call. */
export interface CacheOptions {
  /** Cache key prefix, e.g. `'api:user:list'`. */
  keyPrefix: string;
  /** Optional cache key suffix (e.g. route param id or serialised query). */
  keySuffix?: string;
  /** TTL in milliseconds (cache-manager v6 uses ms). */
  ttl?: number;
}

@Injectable()
export class BaseRepository {
  constructor(
    public readonly paginationService: PaginationService,
    @Optional() protected readonly cacheService?: RedisCacheService,
  ) {}

  // ── Standard (uncached) methods ─────────────────────────────

  public async findOne<T>(model: any, findOneArgs: T) {
    return model.findFirstOrThrow({
      select: findOneArgs['select'],
      where: findOneArgs['where'],
    });
  }

  public async findAll<T>(model: any, options: FindAllOptions<T>) {
    if (options.paginate) {
      return this.paginateQuery<T>(model, options);
    }

    return model.findMany({
      select: options.findManyArgs['select'],
      where: options.findManyArgs['where'],
    });
  }

  public async paginateQuery<T>(model: any, options: FindAllOptions<T>) {
    const paginate = this.paginationService.createPaginator({
      limit: options.findManyArgs.limit,
      page: options.findManyArgs.page,
      resourceBaseUrl: options.resourceBaseUrl,
    });

    return await paginate(model, {
      select: options.findManyArgs['select'],
      where: options.findManyArgs['where'],
    });
  }

  // ── Cached methods ──────────────────────────────────────────

  /**
   * Cache-aside wrapper for `findOne`.
   * Falls through to the database transparently when Redis is down.
   */
  public async findOneCached<T>(
    model: any,
    findOneArgs: T,
    cacheOpts: CacheOptions,
  ) {
    const cacheKey = this.buildKey(cacheOpts);

    if (this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    }

    const result = await this.findOne<T>(model, findOneArgs);

    if (this.cacheService && result) {
      await this.cacheService.setWithPrefix(
        cacheOpts.keyPrefix,
        cacheKey,
        result,
        cacheOpts.ttl,
      );
    }

    return result;
  }

  /**
   * Cache-aside wrapper for `findAll` (with or without pagination).
   * Falls through to the database transparently when Redis is down.
   */
  public async findAllCached<T>(
    model: any,
    options: FindAllOptions<T>,
    cacheOpts: CacheOptions,
  ) {
    const cacheKey = this.buildKey(cacheOpts);

    if (this.cacheService) {
      const cached = await this.cacheService.get(cacheKey);
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    }

    const result = await this.findAll<T>(model, options);

    if (this.cacheService && result) {
      await this.cacheService.setWithPrefix(
        cacheOpts.keyPrefix,
        cacheKey,
        result,
        cacheOpts.ttl,
      );
    }

    return result;
  }

  // ── Cache invalidation ──────────────────────────────────────

  /**
   * Invalidate all cached entries for a model by prefix.
   * Optionally also invalidate a specific item key.
   */
  public async invalidateModelCache(
    modelPrefix: string,
    id?: number | bigint,
  ): Promise<void> {
    if (!this.cacheService) return;

    // Invalidate list caches
    await this.cacheService.delByPrefix(`${modelPrefix}:list`);

    // Invalidate specific item cache
    if (id !== undefined) {
      await this.cacheService.del(`${modelPrefix}:item:${id}`);
    }
  }

  // ── Soft-delete (now with auto-invalidation) ────────────────

  public async softDelete(model: any, id: number, modelPrefix?: string) {
    const result = await model.update({
      where: { id },
      select: { id: true },
      data: { deletedAt: new Date() },
    });

    if (modelPrefix) {
      await this.invalidateModelCache(modelPrefix, id);
    }

    return result;
  }

  // ── Utilities ───────────────────────────────────────────────

  public buildFilters(search: string, columns: string[]) {
    const filterList = search.split(' ');
    const filtersBuilt = [];

    for (const column of columns) {
      for (const filter of filterList) {
        filtersBuilt.push({
          [column]: { contains: filter, mode: 'insensitive' },
        });
      }
    }

    return filtersBuilt;
  }

  /**
   * Build a full cache key from prefix + optional suffix.
   */
  protected buildKey(opts: CacheOptions): string {
    if (opts.keySuffix) {
      return `${opts.keyPrefix}:${opts.keySuffix}`;
    }
    return opts.keyPrefix;
  }
}
