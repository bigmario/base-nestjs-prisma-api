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

describe('AuthController (e2e)', () => {
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

  describe('Public routes validation', () => {
    it('POST /auth/login - should return 401 with empty body', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(401);
    });

    it('POST /auth/recovery - should return 400 with empty body', () => {
      return request(app.getHttpServer())
        .post('/auth/recovery')
        .send({})
        .expect(400);
    });

    it('POST /auth/recovery - should return 400 with invalid email format', () => {
      return request(app.getHttpServer())
        .post('/auth/recovery')
        .send({ email: 'invalid-email' })
        .expect(400);
    });

    it('POST /auth/reset-password - should return 400 with empty body', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({})
        .expect(400);
    });

    it('POST /auth/reset-password - should return 400 with missing fields', () => {
      return request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'abc' })
        .expect(400);
    });
  });

  describe('Protected routes (401 without token)', () => {
    it('GET /auth/test - should return 401', () => {
      return request(app.getHttpServer()).get('/auth/test').expect(401);
    });

    it('DELETE /auth/logout - should return 401', () => {
      return request(app.getHttpServer()).delete('/auth/logout').expect(401);
    });

    it('GET /auth/me - should return 401', () => {
      return request(app.getHttpServer()).get('/auth/me').expect(401);
    });
  });
});
