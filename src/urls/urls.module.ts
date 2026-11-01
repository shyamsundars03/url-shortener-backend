import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Url, UrlSchema } from './schemas/url.schema.js';
import { UrlsService } from './urls.service.js';
import { UrlsRepository } from './repositories/urls.repository.js';
import { UrlsController, UrlRedirectController } from './urls.controller.js';
import { URLS_REPOSITORY } from './interfaces/IUrlsRepository.js';
import { URLS_SERVICE } from './interfaces/IUrlsService.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Url.name, schema: UrlSchema }]),
  ],
  controllers: [UrlsController, UrlRedirectController],
  providers: [
    // ── Concrete classes ───────────────────────────────────────────────────────
    UrlsRepository,
    UrlsService,

    // ── Interface token bindings (useExisting = same instance, no double init) ─
    { provide: URLS_REPOSITORY, useExisting: UrlsRepository },
    { provide: URLS_SERVICE, useExisting: UrlsService },
  ],
  exports: [
    // Export the token so other modules can inject IUrlsService if needed
    URLS_SERVICE,
  ],
})
export class UrlsModule {}
