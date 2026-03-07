import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import type { StringValue } from 'ms';

import type { ApiResponse } from '../../common/interfaces/api-response.interface.js';
import { User, UserRole } from '../users/entities/user.entity.js';

import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import type { AuthUser } from './interfaces/auth-user.interface.js';
import type { JwtPayload } from './interfaces/jwt-payload.interface.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  private toAuthUser(user: User): AuthUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    };
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { email, isActive: true },
      select: [
        'id',
        'email',
        'firstName',
        'lastName',
        'role',
        'passwordHash',
        'isActive',
      ],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid username or password');
    }

    return user;
  }

  async register(dto: RegisterDto): Promise<ApiResponse<AuthUser>> {
    const existing = await this.userRepository.findOne({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException(
        'An account with this email already exists'
      );
    }

    const rounds = this.configService.get<number>('security.bcryptRounds', 12);
    const passwordHash = await bcrypt.hash(dto.password, rounds);

    const user = this.userRepository.create({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      passwordHash,
      role: UserRole.EMPLOYEE,
    });
    const saved = await this.userRepository.save(user);

    return {
      success: true,
      message: 'Registration successful',
      data: this.toAuthUser(saved),
    };
  }

  async login(
    dto: LoginDto
  ): Promise<
    ApiResponse<{ accessToken: string; refreshToken: string; user: AuthUser }>
  > {
    const user = await this.validateUser(dto.email, dto.password);
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, type: 'refresh' },
      {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<StringValue>(
          'jwt.refreshExpiresIn',
          '7d' as StringValue
        ),
      }
    );

    return {
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: this.toAuthUser(user),
      },
    };
  }

  async refreshToken(
    token: string
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    try {
      const payload = await this.jwtService.verifyAsync<
        JwtPayload & { type?: string }
      >(token, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid username or password');
      }

      const newPayload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = await this.jwtService.signAsync(newPayload);
      const refreshToken = await this.jwtService.signAsync(
        { ...newPayload, type: 'refresh' },
        {
          secret: this.configService.get<string>('jwt.refreshSecret'),
          expiresIn: this.configService.get<StringValue>(
            'jwt.refreshExpiresIn',
            '7d' as StringValue
          ),
        }
      );

      return {
        success: true,
        message: 'Token refreshed',
        data: { accessToken, refreshToken },
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async getProfile(userId: string): Promise<ApiResponse<AuthUser>> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return {
      success: true,
      message: 'Profile retrieved',
      data: this.toAuthUser(user),
    };
  }
}
