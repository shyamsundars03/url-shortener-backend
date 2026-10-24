import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { UrlsService } from './urls.service.js';
import { CreateUrlDto } from './dto/create-url.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { isReservedPath } from '../common/constants/reserved-paths.js';

interface AuthenticatedUser {
  id: string;
  email: string;
}

@Controller()
export class UrlsController {
  constructor(private readonly urlsService: UrlsService) {}

  // POST /link — Create a short URL (authenticated)
  @Post('link')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateUrlDto, @Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const url = await this.urlsService.createShortUrl(dto, user.id);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';
    return {
      ...url,
      shortUrlFull: `${baseUrl}/${url.shortUrl}`,
    };
  }

  // GET /link — List authenticated user's URLs with pagination and search
  @Get('link')
  @UseGuards(JwtAuthGuard)
  async findAll(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';
    
    if (search) {
      return this.urlsService.findByUserWithSearch(user.id, search, page, limit);
    }
    return this.urlsService.findByUser(user.id, page, limit);
  }

  // GET /link/count — Count authenticated user's URLs
  @Get('link/count')
  @UseGuards(JwtAuthGuard)
  async count(@Req() req: Request) {
    const user = req.user as AuthenticatedUser;
    const count = await this.urlsService.countByUser(user.id);
    return { count };
  }
}

@Controller()
export class UrlRedirectController {
  constructor(private readonly urlsService: UrlsService) {}

  // GET /:shortUrl — Redirect to original URL (public)
  @Get(':shortUrl')
  async redirect(
    @Param('shortUrl') shortUrl: string,
    @Res() res: Response,
  ) {
    if (isReservedPath(shortUrl)) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(HttpStatus.FOUND, `${frontendUrl}/404`);
    }
    const url = await this.urlsService.findByShortUrl(shortUrl);
    if (!url) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(HttpStatus.FOUND, `${frontendUrl}/404`);
    }
    await this.urlsService.recordVisit(url.id);
    return res.redirect(HttpStatus.FOUND, url.originalUrl);
  }
}
