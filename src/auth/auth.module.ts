import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import type { JwtModuleOptions } from '@nestjs/jwt';
import type { StringValue } from 'ms';

import { User, UserSchema } from './schemas/user.schema.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { UsersService } from './users.service.js';
import { UsersRepository } from './repositories/users.repository.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { AUTH_SERVICE } from './interfaces/IAuthService.js';
import { USERS_REPOSITORY } from './interfaces/IUsersRepository.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): JwtModuleOptions => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') || '15m') as StringValue,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    // ── Concrete classes ───────────────────────────────────────────────────────
    UsersRepository,
    UsersService,
    AuthService,
    JwtStrategy,
    GoogleStrategy,

    // ── Interface token bindings (useExisting = same instance, no double init) ─
    { provide: USERS_REPOSITORY, useExisting: UsersRepository },
    { provide: AUTH_SERVICE, useExisting: AuthService },
  ],
  exports: [
    // Export the token so other modules can inject IAuthService
    AUTH_SERVICE,
    // Export UsersService directly (used by other services internally)
    UsersService,
    // Export JwtModule so other modules can use JwtService
    JwtModule,
  ],
})
export class AuthModule {}
