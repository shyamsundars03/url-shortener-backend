import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Url, UrlSchema } from './schemas/url.schema.js';
import { UrlsService } from './urls.service.js';
import { UrlRedirectController, UrlsController } from './urls.controller.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Url.name, schema: UrlSchema }])],
  providers: [UrlsService],
  controllers: [UrlsController, UrlRedirectController],
  exports: [UrlsService],
})
export class UrlsModule {}
