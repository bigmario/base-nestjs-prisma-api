import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { RedisCacheModule } from '@core/cache/redis-cache.module';
import { PaginationModule } from '@core/pagination/pagination.module';
import { PrismaModule } from '@core/prisma/prisma.module';
import { EmailModule } from '@core/email/email.module';
import { HealthModule } from '@core/health/health.module';

import { UserModule } from '@user/user.module';
import { AuthModule } from '@auth/auth.module';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    RedisCacheModule,
    PrismaModule,
    PaginationModule,
    HealthModule,
    UserModule,
    AuthModule,
    EmailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
