import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for the frontend
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Global validation pipe — strips unknown fields, transforms types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter — consistent error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`\n✅ Backend running      → http://localhost:${port}`);
  console.log(`✅ Health check         → http://localhost:${port}/health`);
  console.log(`✅ Auth                 → /auth/register, /auth/login, /auth/logout, /auth/google`);
  console.log(`✅ Short links          → POST/GET /link, redirect GET /:code`);
  console.log(`✅ Frontend URL         → ${process.env.FRONTEND_URL || 'http://localhost:3000'}\n`);
}
bootstrap();
