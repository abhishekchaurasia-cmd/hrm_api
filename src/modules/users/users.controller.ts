import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { Roles } from '../../common/decorators/roles.decorator.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserRole } from './entities/user.entity.js';

import { PaginationQueryDto } from '../../common/dto/pagination-query.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api/v1/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get all users (HR only)' })
  @ApiResponse({ status: 200, description: 'Users retrieved' })
  findAll(@Query() pagination: PaginationQueryDto) {
    return this.usersService.findAll(pagination);
  }

  @Get('upcoming-birthdays')
  @ApiOperation({ summary: 'Get employees with birthdays in the next 7 days' })
  @ApiResponse({ status: 200, description: 'Upcoming birthdays retrieved' })
  getUpcomingBirthdays() {
    return this.usersService.getUpcomingBirthdays(7);
  }

  @Get('options')
  @Roles(UserRole.HR)
  @ApiOperation({
    summary: 'Get lightweight user list for dropdowns (HR only)',
  })
  @ApiResponse({ status: 200, description: 'User options retrieved' })
  findOptions() {
    return this.usersService.findOptions();
  }

  @Get(':id')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Get user by ID (HR only)' })
  @ApiResponse({ status: 200, description: 'User retrieved' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Create a new user (HR only)' })
  @ApiResponse({ status: 201, description: 'User created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Update a user (HR only)' })
  @ApiResponse({ status: 200, description: 'User updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.HR)
  @ApiOperation({ summary: 'Deactivate a user (HR only)' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
