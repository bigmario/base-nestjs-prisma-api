import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { createKeyv } from '@keyv/redis';

import { PaginationModule } from '@core/pagination/pagination.module';
import { PrismaModule } from '@core/prisma/prisma.module';
import { EmailModule } from '@core/email/email.module';

import { UserModule } from '@user/user.module';
import { AuthModule } from '@auth/auth.module';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';

import { AppController } from './app.controller';

@Module({
  controllers: [AppController],
  imports: [
    ConfigModule.forRoot({ isGlobal: true, expandVariables: true }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.get('REDIS_HOST');
        const redisPort = configService.get('REDIS_PORT');
        const redisUser = configService.get('REDIS_USERNAME');
        const redisPass = configService.get('REDIS_PASSWORD');

        let redisUrl = 'redis://';
        if (redisUser && redisPass) {
          redisUrl += `${redisUser}:${redisPass}@`;
        }
        redisUrl += `${redisHost}:${redisPort}`;

        return {
          stores: [createKeyv(redisUrl)],
        };
      },
      isGlobal: true,
      inject: [ConfigService],
    }),
    PrismaModule,
    PaginationModule,
    UserModule,
    AuthModule,
    EmailModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
