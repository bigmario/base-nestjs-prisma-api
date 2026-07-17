import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from '../services/auth.service';
import { IRequest } from '@auth/interfaces/express';

describe('AuthController', () => {
  let authController: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    logout: jest.fn(),
    getMyInfo: jest.fn(),
    sendRecoveryMail: jest.fn(),
    resetPassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(authController).toBeDefined();
  });

  describe('login', () => {
    it('debería llamar a authService.login con request.user', async () => {
      const req = { user: { id: 1, email: 'test@example.com' } } as unknown as IRequest;
      mockAuthService.login.mockResolvedValue('token');
      
      const result = await authController.login(req);
      expect(authService.login).toHaveBeenCalledWith(req.user);
      expect(result).toBe('token');
    });
  });

  describe('getProfile', () => {
    it('debería retornar request.user', () => {
      const req = { user: { id: 1, email: 'test@example.com' } } as unknown as IRequest;
      const result = authController.getProfile(req);
      expect(result).toEqual(req.user);
    });
  });

  describe('logout', () => {
    it('debería llamar a authService.logout con el request', () => {
      const req = {} as unknown as IRequest;
      mockAuthService.logout.mockReturnValue('ok');
      
      const result = authController.logout(req);
      expect(authService.logout).toHaveBeenCalledWith(req);
      expect(result).toBe('ok');
    });
  });

  describe('getMyInfo', () => {
    it('debería llamar a authService.getMyInfo con request.user', () => {
      const req = { user: { id: 1 } } as unknown as IRequest;
      mockAuthService.getMyInfo.mockReturnValue('info');
      
      const result = authController.getMyInfo(req);
      expect(authService.getMyInfo).toHaveBeenCalledWith(req.user);
      expect(result).toBe('info');
    });
  });

  describe('sendRecoveryMail', () => {
    it('debería llamar a authService.sendRecoveryMail con dto', () => {
      const dto = { email: 'test@example.com' };
      mockAuthService.sendRecoveryMail.mockReturnValue('recovery');
      
      const result = authController.sendRecoveryMail(dto);
      expect(authService.sendRecoveryMail).toHaveBeenCalledWith(dto);
      expect(result).toBe('recovery');
    });
  });

  describe('resetPassword', () => {
    it('debería llamar a authService.resetPassword con dto', () => {
      const dto = { token: '123', newPassword: 'newpass' };
      mockAuthService.resetPassword.mockReturnValue('reset');
      
      const result = authController.resetPassword(dto);
      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toBe('reset');
    });
  });
});
