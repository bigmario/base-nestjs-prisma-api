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

describe('UsersController (e2e)', () => {
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

  describe('Protected routes (401 without token)', () => {
    it('GET /users/roles - should return 401', () => {
      return request(app.getHttpServer()).get('/users/roles').expect(401);
    });

    it('GET /users/statuses - should return 401', () => {
      return request(app.getHttpServer()).get('/users/statuses').expect(401);
    });

    it('POST /users - should return 401', () => {
      return request(app.getHttpServer()).post('/users').send({}).expect(401);
    });

    it('GET /users - should return 401', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('GET /users/:id - should return 401', () => {
      return request(app.getHttpServer()).get('/users/1').expect(401);
    });

    it('PATCH /users/:id - should return 401', () => {
      return request(app.getHttpServer()).patch('/users/1').send({}).expect(401);
    });

    it('DELETE /users/:id - should return 401', () => {
      return request(app.getHttpServer()).delete('/users/1').expect(401);
    });
  });
});
