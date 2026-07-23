import { Test, TestingModule } from '@nestjs/testing';
import { UserController } from './user.controller';
import { UserService } from '../services/user.service';
import {
  mockUser,
  mockUserRoles,
  mockUserStatuses,
  mockPaginatedResult,
} from '../../../test-utils/fixtures/user.fixture';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<UserService>;

  beforeEach(async () => {
    const mockUserService = {
      getAllUserRoles: jest.fn(),
      getAllUserStatuses: jest.fn(),
      createUser: jest.fn(),
      getAllUsers: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserService,
          useValue: mockUserService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userService = module.get(UserService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAllUserRoles', () => {
    it('should delegate to service', async () => {
      const queryParams = {};
      userService.getAllUserRoles.mockResolvedValue(mockUserRoles as any);
      const result = await controller.getAllUserRoles(queryParams);
      expect(userService.getAllUserRoles).toHaveBeenCalledWith(queryParams);
      expect(result).toEqual(mockUserRoles);
    });
  });

  describe('getAllUserStatuses', () => {
    it('should delegate to service', async () => {
      const queryParams = {};
      userService.getAllUserStatuses.mockResolvedValue(mockUserStatuses as any);
      const result = await controller.getAllUserStatuses(queryParams);
      expect(userService.getAllUserStatuses).toHaveBeenCalledWith(queryParams);
      expect(result).toEqual(mockUserStatuses);
    });
  });

  describe('createUser', () => {
    it('should delegate to service with body', async () => {
      const body = {
        email: 'test@test.com',
        password: 'pass',
        name: 'Test',
        lastName: 'User',
        rolId: 1,
      } as any;
      const expectedResult = { message: 'User created', url: '/users/1' };
      userService.createUser.mockResolvedValue(expectedResult);
      const result = await controller.createUser(body);
      expect(userService.createUser).toHaveBeenCalledWith(body);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('getAllUsers', () => {
    it('should delegate to service with query params', async () => {
      const queryParams = { page: 1, limit: 10 };
      userService.getAllUsers.mockResolvedValue(mockPaginatedResult);
      const result = await controller.getAllUsers(queryParams);
      expect(userService.getAllUsers).toHaveBeenCalledWith(queryParams);
      expect(result).toEqual(mockPaginatedResult);
    });
  });

  describe('getUserById', () => {
    it('should delegate to service with id', async () => {
      const id = 1;
      userService.getUserById.mockResolvedValue(mockUser as any);
      const result = await controller.getUserById(id);
      expect(userService.getUserById).toHaveBeenCalledWith(id);
      expect(result).toEqual(mockUser);
    });
  });

  describe('updateUserById', () => {
    it('should delegate to service with id and body', async () => {
      const id = 1;
      const body = { name: 'Updated' } as any;
      const expectedResult = { message: 'User updated', url: '/users/1' };
      userService.updateUser.mockResolvedValue(expectedResult);
      const result = await controller.updateUserById(id, body);
      expect(userService.updateUser).toHaveBeenCalledWith(id, body);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteUser', () => {
    it('should delegate to service with id', async () => {
      const id = 1;
      const expectedResult = { message: 'User deleted' };
      userService.deleteUser.mockResolvedValue(expectedResult);
      const result = await controller.deleteUser(id);
      expect(userService.deleteUser).toHaveBeenCalledWith(id);
      expect(result).toEqual(expectedResult);
    });
  });
});
