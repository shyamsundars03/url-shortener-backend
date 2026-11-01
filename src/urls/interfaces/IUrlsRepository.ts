import { UrlDocument } from '../schemas/url.schema.js';
import { IBaseRepository } from '../../common/repositories/IBaseRepository.js';

/** DI injection token — use this to inject IUrlsRepository */
export const URLS_REPOSITORY = 'URLS_REPOSITORY';

/** Data shape required to create a new short URL */
export interface CreateUrlData {
  shortUrl: string;
  originalUrl: string;
  userId: string;
  lastVisited: string[];
}

/** Paginated query result shape returned by list methods */
export interface PaginatedUrlResult {
  urls: UrlDocument[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Abstraction for all URL-related database operations.
 * Extends IBaseRepository for create, findById, findOne.
 * UrlsService depends on this interface, not on the Mongoose Model directly.
 * Follows the Dependency Inversion Principle (DIP).
 */
export interface IUrlsRepository extends IBaseRepository<UrlDocument, CreateUrlData> {
  /** Fetch a paginated list of URLs for a user, sorted newest first */
  findByUser(userId: string, skip: number, limit: number): Promise<UrlDocument[]>;

  /** Fetch a paginated list of URLs matching a search regex, sorted newest first */
  findByUserWithSearch(
    userId: string,
    search: RegExp,
    skip: number,
    limit: number,
  ): Promise<UrlDocument[]>;

  /** Count all URLs belonging to a user */
  countByUser(userId: string): Promise<number>;

  /** Count URLs belonging to a user that match a search regex */
  countByUserWithSearch(userId: string, search: RegExp): Promise<number>;

  /** Find a URL by its short code */
  findByShortUrl(shortUrl: string): Promise<UrlDocument | null>;

  /** Overwrite the lastVisited array for a URL document */
  appendVisit(id: string, lastVisited: string[]): Promise<void>;
}
