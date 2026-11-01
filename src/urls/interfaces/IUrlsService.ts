import { UrlDocument } from '../schemas/url.schema.js';
import { CreateUrlDto } from '../dto/create-url.dto.js';
import { PaginatedUrlResult } from './IUrlsRepository.js';

/** DI injection token — use this to inject IUrlsService */
export const URLS_SERVICE = 'URLS_SERVICE';

/** Shape of the create response — URL document + full short URL */
export interface CreatedUrlResponse {
  id: string;
  shortUrl: string;
  originalUrl: string;
  userId: string;
  lastVisited: string[];
  shortUrlFull: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Abstraction for all URL shortener business logic.
 * UrlsController depends on this interface, not on the concrete UrlsService.
 * Follows the Dependency Inversion Principle (DIP).
 */
export interface IUrlsService {
  /** Validate, deduplicate, and persist a new short URL */
  createShortUrl(dto: CreateUrlDto, userId: string): Promise<UrlDocument>;

  /** Return a paginated list of URLs for a user */
  findByUser(userId: string, page: number, limit: number): Promise<PaginatedUrlResult>;

  /** Return a paginated list of URLs for a user filtered by a search term */
  findByUserWithSearch(
    userId: string,
    searchTerm: string,
    page: number,
    limit: number,
  ): Promise<PaginatedUrlResult>;

  /** Return the total count of URLs belonging to a user */
  countByUser(userId: string): Promise<number>;

  /** Resolve a short code to its URL document */
  findByShortUrl(shortUrl: string): Promise<UrlDocument | null>;

  /** Append a visit timestamp to a URL's lastVisited array */
  recordVisit(id: string): Promise<void>;
}
