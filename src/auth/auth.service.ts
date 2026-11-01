import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { UserDocument } from './schemas/user.schema.js';
import { UsersService } from './users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import {
  IAuthService,
  AuthTokens,
  GoogleUserData,
} from './interfaces/IAuthService.js';

@Injectable()
export class AuthService implements IAuthService {
  private readonly _usersService: UsersService;
  private readonly _jwtService: JwtService;
  private readonly _configService: ConfigService;

  constructor(
    usersService: UsersService,
    jwtService: JwtService,
    configService: ConfigService,
  ) {
    this._usersService = usersService;
    this._jwtService = jwtService;
    this._configService = configService;
  }

  // ─── Token Generation Helper ─────────────────────────────────────────────────
  private _generateTokens(payload: {
    sub: string;
    email: string;
    name?: string;
  }): AuthTokens {
    const accessToken = this._jwtService.sign(payload, {
      expiresIn: (this._configService.get<string>('JWT_EXPIRES_IN') || '15m') as StringValue,
    });
    const refreshToken = this._jwtService.sign(payload, {
      expiresIn: (this._configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as StringValue,
    });
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  // ─── Registration ────────────────────────────────────────────────────────────
  async register(dto: RegisterDto): Promise<AuthTokens> {
    const existing = await this._usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already in use');
    }

    const user = await this._usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });

    const payload = { sub: user.id as string, email: user.email, name: user.name };
    return this._generateTokens(payload);
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this._usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('No account found with this email address');
    }
    if (!user.password) {
      throw new UnauthorizedException(
        'This account uses Google sign-in. Please continue with Google',
      );
    }
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password');
    }

    const payload = { sub: user.id as string, email: user.email, name: user.name };
    return this._generateTokens(payload);
  }

  // ─── Refresh Tokens ──────────────────────────────────────────────────────────
  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    try {
      const decoded = this._jwtService.verify(refreshToken) as {
        sub: string;
        email: string;
        name?: string;
      };
      const user = await this._usersService.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }
      const payload = { sub: user.id as string, email: user.email, name: user.name };
      return this._generateTokens(payload);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─── Credential Validation (used by Passport local strategy) ────────────────
  async validateUser(
    email: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this._usersService.findByEmail(email);
    if (!user || !user.password) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  // ─── Google OAuth ────────────────────────────────────────────────────────────
  async validateGoogleUser(googleUser: GoogleUserData): Promise<UserDocument> {
    let user = await this._usersService.findByGoogleId(googleUser.googleId);
    if (user) return user;

    user = await this._usersService.findByEmail(googleUser.email);
    if (user) {
      if (!user.googleId) {
        return this._usersService.linkGoogleAccount(user.id as string, googleUser.googleId);
      }
      return user;
    }

    return this._usersService.create({
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.googleId,
    });
  }

  async googleLogin(googleUser: GoogleUserData): Promise<AuthTokens> {
    const user = await this.validateGoogleUser(googleUser);
    const payload = { sub: user.id as string, email: user.email };
    return this._generateTokens(payload);
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────
  logout(): { message: string } {
    return { message: 'Logged out successfully' };
  }
}
