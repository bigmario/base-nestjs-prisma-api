import { Test, TestingModule } from '@nestjs/testing';
import { ValidationPipe, INestApplication } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { AppModule } from '../app.module';
import { PrismaService } from '@core/prisma/services/prisma.service';
import { EmailService } from '@core/email/services/email.service';
import { createMockPrismaService } from './mocks/prisma.mock';
import { createMockCacheManager } from './mocks/cache.mock';
import { createMockEmailService } from './mocks/email.mock';

export async function createTestApp(): Promise<{
  app: INestApplication;
  prismaService: any;
  cacheManager: any;
  emailService: any;
}> {
  const prismaMock = createMockPrismaService();
  const cacheMock = createMockCacheManager();
  const emailMock = createMockEmailService();

  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock)
    .overrideProvider(CACHE_MANAGER)
    .useValue(cacheMock)
    .overrideProvider(EmailService)
    .useValue(emailMock)
    .compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  await app.init();

  return {
    app,
    prismaService: prismaMock,
    cacheManager: cacheMock,
    emailService: emailMock,
  };
}
