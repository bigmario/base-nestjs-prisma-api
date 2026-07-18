import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/services/prisma.service';
import { createMockPrismaService } from '../src/test-utils/mocks/prisma.mock';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { createMockCacheManager } from '../src/test-utils/mocks/cache.mock';
import { EmailService } from '../src/core/email/services/email.service';
import { createMockEmailService } from '../src/test-utils/mocks/email.mock';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.REDIS_HOST = 'localhost';
    process.env.REDIS_PORT = '6379';
    process.env.JWT_SECRET = 'test-secret';
    process.env.BASE_URL = 'http://localhost:3000';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createMockPrismaService())
      .overrideProvider(CACHE_MANAGER)
      .useValue(createMockCacheManager())
      .overrideProvider(EmailService)
      .useValue(createMockEmailService())
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET / should return 200 with greeting message', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('nice to greet you!, human');
  });
});
