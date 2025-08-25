import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { Role, Roles } from './decorators';
import { UpdateUserDto } from './dto';
import { AccessAuthGuard } from './guards/access.guard';
import { RolesGuard } from './guards/roles.guard';
import { UserService } from './services/user.service';

@ApiTags('User Management')
@ApiBearerAuth()
@Controller('users')
@UseGuards(AccessAuthGuard)
@Roles(Role.ADMIN)
export class UserManagementController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of users per page',
    example: 10,
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: Role,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by user active status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by name or email',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Users retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            users: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  email: { type: 'string' },
                  name: { type: 'string' },
                  role: { type: 'string', enum: ['USER', 'ADMIN'] },
                  isActive: { type: 'boolean' },
                  profilePicture: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number' },
                limit: { type: 'number' },
                total: { type: 'number' },
                pages: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions (Admin required)',
  })
  async getAllUsers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('cursor') cursor?: string,
    @Query('search') search?: string,
  ) {
    return this.userService.findAllUsers(limit, cursor, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clm1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User found' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            isActive: { type: 'boolean' },
            profilePicture: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions (Admin required)',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @UseGuards(AccessAuthGuard, RolesGuard)
  async getUserById(@Param('id') id: string) {
    return this.authService.getCurrentUser(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clm1234567890',
  })
  @ApiBody({
    description: 'User update data',
    type: UpdateUserDto,
    examples: {
      updateRole: {
        summary: 'Update user role',
        value: {
          role: 'USER',
        },
      },
      deactivateUser: {
        summary: 'Deactivate user',
        value: {
          isActive: false,
        },
      },
      fullUpdate: {
        summary: 'Full profile update',
        value: {
          name: 'Updated Name',
          role: 'USER',
          isActive: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'User updated successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            username: { type: 'string' },
            role: { type: 'string', enum: ['USER', 'ADMIN'] },
            isActive: { type: 'boolean' },
            profilePicture: { type: 'string' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions (Admin required)',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @UseGuards(AccessAuthGuard, RolesGuard)
  async updateUserById(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.authService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete user by ID (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clm1234567890',
  })
  @ApiResponse({
    status: 204,
    description: 'User deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions (Admin required)',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @UseGuards(AccessAuthGuard, RolesGuard)
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle user active/inactive status (Admin only)' })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clm1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'User status toggled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'User status updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            isActive: { type: 'boolean' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - invalid or expired token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions (Admin required)',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @UseGuards(AccessAuthGuard, RolesGuard)
  async toggleUserStatus(@Param('id') id: string) {
    const user = await this.userService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return this.authService.updateUser(id, {
      isActive: !user.isActive,
    });
  }
}
