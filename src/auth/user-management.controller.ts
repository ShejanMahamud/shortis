import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
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
import { Role } from 'generated/prisma';
import { AuthService } from './auth.service';
import { UpdateUserDto } from './dto';
import { AccessAuthGuard } from './guards/access.guard';
import { UserService } from './services/user.service';

@ApiTags('User Management')
@Controller('users')
@UseGuards(AccessAuthGuard)
@ApiBearerAuth()
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
                  role: { type: 'string', enum: ['USER', 'ADMIN', 'PREMIUM'] },
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
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('role') role?: Role,
    @Query('isActive') isActive?: boolean,
    @Query('search') search?: string,
  ) {
    // TODO: Add role-based access control middleware
    const filters: Record<string, any> = {
      ...(role && { role }),
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    return this.userService.findAllUsers({
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      filters,
    });
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
            role: { type: 'string', enum: ['USER', 'ADMIN', 'PREMIUM'] },
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
  async getUserById(@Param('id') id: string) {
    // TODO: Add role-based access control middleware
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
          role: 'PREMIUM',
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
          role: 'PREMIUM',
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
            role: { type: 'string', enum: ['USER', 'ADMIN', 'PREMIUM'] },
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
  async updateUserById(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    // TODO: Add role-based access control middleware
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
  async deleteUser(@Param('id') id: string) {
    // TODO: Add role-based access control middleware and implement soft delete
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
  async toggleUserStatus(@Param('id') id: string) {
    // TODO: Add role-based access control middleware
    const user = await this.userService.findById(id);
    if (!user) {
      throw new Error('User not found');
    }

    return this.authService.updateUser(id, {
      isActive: !user.isActive,
    });
  }

  @Get(':id/urls')
  @ApiOperation({ summary: "Get user's URLs (Admin only)" })
  @ApiParam({
    name: 'id',
    description: 'User ID',
    example: 'clm1234567890',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of URLs per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: "User's URLs retrieved successfully",
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'User URLs retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            urls: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  originalUrl: { type: 'string' },
                  slug: { type: 'string' },
                  title: { type: 'string' },
                  isActive: { type: 'boolean' },
                  clicks: { type: 'number' },
                  createdAt: { type: 'string', format: 'date-time' },
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
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  getUserUrls(
    @Param('id') id: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    // TODO: Add role-based access control middleware
    // TODO: Integrate with ShortnerService to get user's URLs
    return {
      success: true,
      message: 'User URLs retrieved successfully',
      data: {
        urls: [],
        pagination: {
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          total: 0,
          pages: 0,
        },
      },
    };
  }
}
