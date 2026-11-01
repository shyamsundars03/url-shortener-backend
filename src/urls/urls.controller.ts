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
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CreateUrlDto } from './dto/create-url.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { isReservedPath } from '../common/constants/reserved-paths.js';
import { IUrlsService, URLS_SERVICE } from './interfaces/IUrlsService.js';
import { PaginatedUrlResult } from './interfaces/IUrlsRepository.js';
import { ApiResponse } from '../common/response/api-response.js';
import { URL_ROUTES } from '../common/constants/api-routes.constant.js';

interface AuthenticatedUser {
  id: string;
  email: string;
}

interface CreatedUrlData {
  id: string;
  shortUrl: string;
  originalUrl: string;
  userId: string;
  lastVisited: string[];
  shortUrlFull: string;
}

// ─── URLs Controller (authenticated CRUD) ─────────────────────────────────────

@Controller()
export class UrlsController {
  private readonly _urlsService: IUrlsService;

  constructor(
    @Inject(URLS_SERVICE)
    urlsService: IUrlsService,
  ) {
    this._urlsService = urlsService;
  }

  @Post(URL_ROUTES.LINK)
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateUrlDto,
    @Req() req: Request,
  ): Promise<ApiResponse<CreatedUrlData>> {
    const user = req.user as AuthenticatedUser;
    const url = await this._urlsService.createShortUrl(dto, user.id);
    const baseUrl = process.env.BASE_URL || 'http://localhost:3001';

    return ApiResponse.created(
      {
        id: url.id as string,
        shortUrl: url.shortUrl,
        originalUrl: url.originalUrl,
        userId: url.userId,
        lastVisited: url.lastVisited,
        shortUrlFull: `${baseUrl}/${url.shortUrl}`,
      },
      'Short URL created successfully',
    );
  }

  @Get(URL_ROUTES.LINK_COUNT)
  @UseGuards(JwtAuthGuard)
  async count(@Req() req: Request): Promise<ApiResponse<{ count: number }>> {
    const user = req.user as AuthenticatedUser;
    const count = await this._urlsService.countByUser(user.id);
    return ApiResponse.ok({ count }, 'URL count retrieved');
  }

  @Get(URL_ROUTES.LINK)
  @UseGuards(JwtAuthGuard)
  async findAll(
    @Req() req: Request,
  ): Promise<ApiResponse<PaginatedUrlResult>> {
    const user = req.user as AuthenticatedUser;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = (req.query.search as string) || '';

    const result = search
      ? await this._urlsService.findByUserWithSearch(user.id, search, page, limit)
      : await this._urlsService.findByUser(user.id, page, limit);

    return ApiResponse.ok(result, 'URLs retrieved successfully');
  }
}

// ─── URL Redirect Controller (public) ────────────────────────────────────────

@Controller()
export class UrlRedirectController {
  private readonly _urlsService: IUrlsService;

  constructor(
    @Inject(URLS_SERVICE)
    urlsService: IUrlsService,
  ) {
    this._urlsService = urlsService;
  }

  @Get(URL_ROUTES.SHORT_URL)
  async redirect(
    @Param('shortUrl') shortUrl: string,
    @Res() res: Response,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (isReservedPath(shortUrl)) {
      res.redirect(HttpStatus.FOUND, `${frontendUrl}/404`);
      return;
    }

    const url = await this._urlsService.findByShortUrl(shortUrl);
    if (!url) {
      res.redirect(HttpStatus.FOUND, `${frontendUrl}/404`);
      return;
    }

    await this._urlsService.recordVisit(url.id as string);
    res.redirect(HttpStatus.FOUND, url.originalUrl);
  }
}
