import { IsUrl } from 'class-validator';

export class CreateUrlDto {
  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    { message: 'Please provide a valid URL with http or https protocol' },
  )
  originalUrl: string;
}
