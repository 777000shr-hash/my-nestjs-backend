import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('api/ping')
  getPing() {
    return { status: 'ok' };
  }  
}
