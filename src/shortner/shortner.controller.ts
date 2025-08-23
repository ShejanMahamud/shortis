import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { IJwtPayload } from '../auth/interfaces/auth.interface';
import { AccessUrlDto } from './dto/access-url.dto';
import { CreateShortnerDto } from './dto/create-shortner.dto';
import { GetAnalyticsDto } from './dto/get-analytics.dto';
import { UpdateShortnerDto } from './dto/update-shortner.dto';
import { ShortnerService } from './shortner.service';

@ApiTags('URL Shortener')
@Controller('shortner')
export class ShortnerController {
  constructor(private readonly shortnerService: ShortnerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a shortened URL' })
  @ApiResponse({ status: 201, description: 'URL created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - invalid input' })
  @ApiResponse({ status: 409, description: 'Slug already exists' })
  async create(
    @Body() createShortnerDto: CreateShortnerDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as IJwtPayload)?.sub; // Get user ID from auth context if available
    return this.shortnerService.create(createShortnerDto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all URLs (paginated)' })
  @ApiResponse({ status: 200, description: 'URLs retrieved successfully' })
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Req() req: Request,
  ) {
    const userId = (req.user as IJwtPayload)?.sub; // Only return user's URLs if authenticated
    return this.shortnerService.findAll(
      userId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get URL details by ID' })
  @ApiResponse({ status: 200, description: 'URL details retrieved' })
  @ApiResponse({ status: 404, description: 'URL not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized access' })
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as IJwtPayload)?.sub;
    return this.shortnerService.findOne(id, userId);
  }

  @Get(':id/analytics')
  @ApiOperation({ summary: 'Get URL analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  @ApiResponse({ status: 404, description: 'URL not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized access' })
  async getAnalytics(
    @Param('id') id: string,
    @Query() analyticsDto: GetAnalyticsDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as IJwtPayload)?.sub;
    return this.shortnerService.getAnalytics(id, analyticsDto, userId);
  }

  @Post(':slug/access')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Access password-protected URL' })
  @ApiResponse({
    status: 200,
    description: 'Access granted, returns original URL',
  })
  @ApiResponse({ status: 401, description: 'Incorrect password' })
  @ApiResponse({ status: 404, description: 'URL not found' })
  async accessProtectedUrl(
    @Param('slug') slug: string,
    @Body() accessDto: AccessUrlDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as IJwtPayload)?.sub;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');
    const referer = req.get('Referer');

    const originalUrl = await this.shortnerService.redirectToUrl(
      slug,
      accessDto,
      ipAddress,
      userAgent,
      referer,
      userId,
    );

    return { originalUrl };
  }

  @Get('r/:slug')
  @ApiOperation({ summary: 'Redirect to original URL' })
  @ApiResponse({ status: 302, description: 'Redirect to original URL' })
  @ApiResponse({ status: 404, description: 'URL not found' })
  @ApiResponse({
    status: 403,
    description: 'URL expired, inactive, or password protected',
  })
  async redirect(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    try {
      const userId = (req.user as IJwtPayload)?.sub;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      const referer = req.get('Referer');

      const originalUrl = await this.shortnerService.redirectToUrl(
        slug,
        undefined,
        ipAddress,
        userAgent,
        referer,
        userId,
      );

      return res.redirect(302, originalUrl);
    } catch (error) {
      // Handle password-protected URLs differently
      if (error.message?.includes('Password required')) {
        return res.status(401).json({
          message: 'This URL is password protected',
          requiresPassword: true,
          slug,
        });
      }
      throw error;
    }
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update URL details' })
  @ApiResponse({ status: 200, description: 'URL updated successfully' })
  @ApiResponse({ status: 404, description: 'URL not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized access' })
  async update(
    @Param('id') id: string,
    @Body() updateShortnerDto: UpdateShortnerDto,
    @Req() req: Request,
  ) {
    const userId = (req.user as IJwtPayload)?.sub;
    return this.shortnerService.update(id, updateShortnerDto, userId);
  }

  @Patch(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle URL active/inactive status' })
  @ApiResponse({ status: 200, description: 'URL status toggled successfully' })
  @ApiResponse({ status: 404, description: 'URL not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized access' })
  async toggleStatus(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as IJwtPayload)?.sub;
    return this.shortnerService.toggleUrlStatus(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete URL' })
  @ApiResponse({ status: 204, description: 'URL deleted successfully' })
  @ApiResponse({ status: 404, description: 'URL not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized access' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const userId = (req.user as IJwtPayload)?.sub;
    await this.shortnerService.remove(id, userId);
  }
}
