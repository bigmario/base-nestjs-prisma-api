import { Global, Logger, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createKeyv, createClient } from '@keyv/redis';

import { RedisCacheService } from '@core/cache/redis-cache.service';

/**
 * Global Redis Cache Module.
 *
 * Centralises cache configuration so every module in the application
 * can inject `RedisCacheService` or `CACHE_MANAGER` without
 * re-declaring imports.
 *
 * Connection details are read from environment variables following
 * the 12-Factor App methodology:
 *   - `REDIS_URL` (full connection string, takes precedence)
 *   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_USERNAME`, `REDIS_PASSWORD`
 */
@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');

        let connectionUrl: string;
        if (redisUrl) {
          connectionUrl = redisUrl;
        } else {
          const host = configService.get<string>('REDIS_HOST', 'localhost');
          const port = configService.get<number>('REDIS_PORT', 6379);
          const user = configService.get<string>('REDIS_USERNAME');
          const pass = configService.get<string>('REDIS_PASSWORD');

          connectionUrl = 'redis://';
          if (user && pass) {
            connectionUrl += `${user}:${pass}@`;
          }
          connectionUrl += `${host}:${port}`;
        }

        const store = createKeyv({
          url: connectionUrl,
          socket: {
            connectTimeout: 500, // 500ms fast connection timeout when Redis is offline
            reconnectStrategy: (retries: number) => {
              if (retries > 1) return false; // Fail fast when offline
              return 50;
            },
          },
        } as any);
        const logger = new Logger('RedisCacheModule');

        const errorHandler = (err: Error) => {
          logger.warn(
            `Redis connection issue (degrading gracefully to DB): ${err.message}`,
          );
        };

        store.on('error', errorHandler);

        // Handle error events directly on the underlying node-redis client
        const innerStore: any = (store as any).opts?.store;
        if (innerStore && innerStore._client) {
          innerStore._client.on('error', errorHandler);
        }

        return {
          stores: [store],
        };
      },
      isGlobal: true,
    }),
  ],
  providers: [RedisCacheService],
  exports: [CacheModule, RedisCacheService],
})
export class RedisCacheModule {}
