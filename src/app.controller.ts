import { Controller, Get, Req } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Request } from 'express';
import { getSystemInfoJson } from './utils/system-info';

@ApiExcludeController()
@Controller()
export class AppController {
  constructor() {}

  @Get()
  getHello(@Req() req: Request) {
    return {
      success: true,
      message: 'Server is operational',
      data: {
        api_docs: `${req.protocol}://${req.get('host')}/v1/api/docs`,
      },
      meta: getSystemInfoJson(),
    };
  }
}
