import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): object {
    return {
      status: 'ok',
      message: 'URL Shortener API is running',
      timestamp: new Date().toISOString(),
      port: process.env.PORT || 3001,
    };
  }

  @Get('login')
  loginPage(@Res() res: Response): void {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login`);
  }

  @Get('register')
  registerPage(@Res() res: Response): void {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/register`);
  }
}
