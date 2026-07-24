import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';

import { PaginationService } from './pagination.service';

describe('PaginationService', () => {
  let service: PaginationService;
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    configService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaginationService,
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<PaginationService>(PaginationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('buildUrl', () => {
    it('should compose a resource URL from BASE_URL, base path and id', () => {
      const url = service.buildUrl(7, '/users');

      expect(configService.get).toHaveBeenCalledWith('BASE_URL');
      expect(url).toBe('http://localhost:3000/users/7');
    });
  });

  describe('createPaginator', () => {
    it('should compute skip/take and navigation urls for a middle page', async () => {
      const model = {
        count: jest.fn().mockResolvedValue(25),
        findMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      };
      const paginate = service.createPaginator({
        page: 2,
        limit: 10,
        resourceBaseUrl: '/users',
      });

      const result = await paginate(model, { where: { deletedAt: null } });

      expect(model.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
      expect(model.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        take: 10,
        skip: 10,
      });
      expect(result.data).toEqual([{ id: 1 }]);
      expect(result.meta).toEqual({
        totalItems: 25,
        page: 2,
        limit: 10,
        previousPageUrl: 'http://localhost:3000/users?limit=10&page=1',
        nextPageUrl: 'http://localhost:3000/users?limit=10&page=3',
        firstPageUrl: 'http://localhost:3000/users?limit=10&page=1',
        lastPageUrl: 'http://localhost:3000/users?limit=10&page=3',
      });
    });

    it('should return null previous url on the first page', async () => {
      const model = {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([]),
      };
      const paginate = service.createPaginator({
        page: 1,
        limit: 10,
        resourceBaseUrl: '/users',
      });

      const result = await paginate(model, {});

      expect(model.findMany).toHaveBeenCalledWith({ take: 10, skip: 0 });
      expect(result.meta.previousPageUrl).toBeNull();
      expect(result.meta.nextPageUrl).toBeNull();
    });

    it('should return null next url on the last page', async () => {
      const model = {
        count: jest.fn().mockResolvedValue(20),
        findMany: jest.fn().mockResolvedValue([]),
      };
      const paginate = service.createPaginator({
        page: 2,
        limit: 10,
        resourceBaseUrl: '/users',
      });

      const result = await paginate(model, {});

      expect(result.meta.nextPageUrl).toBeNull();
      expect(result.meta.previousPageUrl).toBe(
        'http://localhost:3000/users?limit=10&page=1',
      );
    });

    it('should fall back to defaults when page/limit are missing', async () => {
      const model = {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      };
      const paginate = service.createPaginator({
        resourceBaseUrl: '/users',
      } as any);

      const result = await paginate(model, {});

      expect(model.findMany).toHaveBeenCalledWith({ take: 10, skip: 0 });
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });
  });
});
