import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import shortid from 'shortid';
import { UrlDocument } from './schemas/url.schema.js';
import { CreateUrlDto } from './dto/create-url.dto.js';
import {
  IUrlsRepository,
  URLS_REPOSITORY,
  PaginatedUrlResult,
} from './interfaces/IUrlsRepository.js';
import { IUrlsService } from './interfaces/IUrlsService.js';

@Injectable()
export class UrlsService implements IUrlsService {
  private readonly _urlsRepository: IUrlsRepository;

  constructor(
    @Inject(URLS_REPOSITORY)
    urlsRepository: IUrlsRepository,
  ) {
    this._urlsRepository = urlsRepository;
  }

  // ─── URL Validation (business rule) ─────────────────────────────────────────
  private _isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ─── Unique Short ID Generation ──────────────────────────────────────────────
  private async _generateUniqueShortId(): Promise<string> {
    let shortCode: string;
    let exists: UrlDocument | null;
    do {
      shortCode = shortid.generate();
      exists = await this._urlsRepository.findByShortUrl(shortCode);
    } while (exists);
    return shortCode;
  }

  // ─── Create Short URL ────────────────────────────────────────────────────────
  async createShortUrl(dto: CreateUrlDto, userId: string): Promise<UrlDocument> {
    if (!this._isValidUrl(dto.originalUrl)) {
      throw new BadRequestException(
        'Invalid URL format. Must use http or https protocol.',
      );
    }

    const existing = await this._urlsRepository.findOne({
      userId,
      originalUrl: dto.originalUrl,
    });
    if (existing) {
      throw new BadRequestException(
        'This URL is already shortened. Check your links below.',
      );
    }

    const shortCode = await this._generateUniqueShortId();

    return this._urlsRepository.create({
      shortUrl: shortCode,
      originalUrl: dto.originalUrl,
      userId,
      lastVisited: [],
    });
  }

  // ─── Get URLs by User with Pagination ────────────────────────────────────────
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedUrlResult> {
    const skip = (page - 1) * limit;
    const [urls, total] = await Promise.all([
      this._urlsRepository.findByUser(userId, skip, limit),
      this._urlsRepository.countByUser(userId),
    ]);
    return { urls, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Get URLs by User with Search ────────────────────────────────────────────
  async findByUserWithSearch(
    userId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedUrlResult> {
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(searchTerm, 'i');
    const [urls, total] = await Promise.all([
      this._urlsRepository.findByUserWithSearch(userId, searchRegex, skip, limit),
      this._urlsRepository.countByUserWithSearch(userId, searchRegex),
    ]);
    return { urls, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ─── Count URLs by User ───────────────────────────────────────────────────────
  async countByUser(userId: string): Promise<number> {
    return this._urlsRepository.countByUser(userId);
  }

  // ─── Find by Short Code ───────────────────────────────────────────────────────
  async findByShortUrl(shortUrl: string): Promise<UrlDocument | null> {
    return this._urlsRepository.findByShortUrl(shortUrl);
  }

  // ─── Record Visit ─────────────────────────────────────────────────────────────
  async recordVisit(id: string): Promise<void> {
    const url = await this._urlsRepository.findById(id);
    if (!url) return;
    const visited = Array.isArray(url.lastVisited) ? url.lastVisited : [];
    visited.push(new Date().toISOString());
    await this._urlsRepository.appendVisit(id, visited);
  }
}
