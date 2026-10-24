import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import shortid from 'shortid';
import { Url, UrlDocument } from './schemas/url.schema.js';
import { CreateUrlDto } from './dto/create-url.dto.js';

@Injectable()
export class UrlsService {
  constructor(
    @InjectModel(Url.name)
    private readonly urlModel: Model<UrlDocument>,
  ) {}

  // ─── URL Validation ─────────────────────────────────────────────
  private validateUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // ─── Unique Short ID generation ─────────────────────────────────
  private async generateUniqueShortId(): Promise<string> {
    let shortCode: string;
    let exists: UrlDocument | null;
    do {
      shortCode = shortid.generate();
      exists = await this.urlModel.findOne({ shortUrl: shortCode }).exec();
    } while (exists);
    return shortCode;
  }

  // ─── Create Short URL ────────────────────────────────────────────
  async createShortUrl(dto: CreateUrlDto, userId: string): Promise<UrlDocument> {
    if (!this.validateUrl(dto.originalUrl)) {
      throw new BadRequestException(
        'Invalid URL format. Must use http or https protocol.',
      );
    }

    // Check if user already has this URL shortened
    const existing = await this.urlModel
      .findOne({ userId, originalUrl: dto.originalUrl })
      .exec();
    if (existing) {
      throw new BadRequestException(
        'This URL is already shortened. Check your links below.',
      );
    }

    const shortCode = await this.generateUniqueShortId();
    const url = new this.urlModel({
      shortUrl: shortCode,
      originalUrl: dto.originalUrl,
      userId,
      lastVisited: [],
    });

    return url.save();
  }

  // ─── Get URLs by User with Pagination ─────────────────────────────
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ urls: UrlDocument[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const [urls, total] = await Promise.all([
      this.urlModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.urlModel.countDocuments({ userId }).exec(),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { urls, total, page, limit, totalPages };
  }

  // ─── Get URLs by User with Search ─────────────────────────────────
  async findByUserWithSearch(
    userId: string,
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ urls: UrlDocument[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const searchRegex = new RegExp(searchTerm, 'i');
    const [urls, total] = await Promise.all([
      this.urlModel
        .find({ userId, originalUrl: searchRegex })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.urlModel.countDocuments({ userId, originalUrl: searchRegex }).exec(),
    ]);
    const totalPages = Math.ceil(total / limit);
    return { urls, total, page, limit, totalPages };
  }

  // ─── Count URLs by User ───────────────────────────────────────────
  async countByUser(userId: string): Promise<number> {
    return this.urlModel.countDocuments({ userId }).exec();
  }

  // ─── Find by Short Code ──────────────────────────────────────────
  async findByShortUrl(shortUrl: string): Promise<UrlDocument | null> {
    const url = await this.urlModel.findOne({ shortUrl }).exec();
    return url;
  }

  // ─── Record Visit ────────────────────────────────────────────────
  async recordVisit(id: string): Promise<void> {
    const url = await this.urlModel.findById(id).exec();
    if (!url) return;
    const visited = Array.isArray(url.lastVisited) ? url.lastVisited : [];
    visited.push(new Date().toISOString());
    await this.urlModel.findByIdAndUpdate(id, { lastVisited: visited }).exec();
  }
}
