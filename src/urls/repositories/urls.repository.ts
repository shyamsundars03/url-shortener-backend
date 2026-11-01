import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Url, UrlDocument } from '../schemas/url.schema.js';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { IUrlsRepository, CreateUrlData } from '../interfaces/IUrlsRepository.js';

@Injectable()
export class UrlsRepository
  extends BaseRepository<UrlDocument, CreateUrlData>
  implements IUrlsRepository
{
  private readonly _urlModel: Model<UrlDocument>;

  constructor(
    @InjectModel(Url.name)
    urlModel: Model<UrlDocument>,
  ) {
    super(urlModel);
    this._urlModel = urlModel;
  }

  // ─── Inherited from BaseRepository (no overrides — LSP preserved) ────────────
  // create(data: CreateUrlData): Promise<UrlDocument>
  // findById(id: string): Promise<UrlDocument | null>
  // findOne(filter: Record<string, unknown>): Promise<UrlDocument | null>

  // ─── Domain-specific queries ─────────────────────────────────────────────────

  async findByUser(
    userId: string,
    skip: number,
    limit: number,
  ): Promise<UrlDocument[]> {
    return this._urlModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async findByUserWithSearch(
    userId: string,
    search: RegExp,
    skip: number,
    limit: number,
  ): Promise<UrlDocument[]> {
    return this._urlModel
      .find({ userId, originalUrl: search })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  }

  async countByUser(userId: string): Promise<number> {
    return this._urlModel.countDocuments({ userId }).exec();
  }

  async countByUserWithSearch(userId: string, search: RegExp): Promise<number> {
    return this._urlModel
      .countDocuments({ userId, originalUrl: search })
      .exec();
  }

  async findByShortUrl(shortUrl: string): Promise<UrlDocument | null> {
    return this._urlModel.findOne({ shortUrl }).exec();
  }

  async appendVisit(id: string, lastVisited: string[]): Promise<void> {
    await this._urlModel
      .findByIdAndUpdate(id, { lastVisited })
      .exec();
  }
}
