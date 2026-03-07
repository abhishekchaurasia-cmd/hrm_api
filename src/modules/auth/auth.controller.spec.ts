import { Test, type TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';

describe('AuthController', () => {
  let controller: AuthController;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    getProfile: jest.fn(),
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

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register with the dto', async () => {
      const dto = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'password123',
      };

      const expected = {
        success: true,
        message: 'Registration successful',
        data: {
          id: 'uuid',
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: 'employee',
        },
      };

      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);
      expect(result).toEqual(expected);
      expect(mockAuthService.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login with the dto', async () => {
      const dto = { email: 'john@example.com', password: 'password123' };
      const expected = {
        success: true,
        message: 'Login successful',
        data: {
          accessToken: 'token',
          user: {
            id: 'uuid',
            email: dto.email,
            firstName: 'John',
            lastName: 'Doe',
            role: 'employee',
          },
        },
      };

      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);
      expect(result).toEqual(expected);
      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
    });
  });
});
