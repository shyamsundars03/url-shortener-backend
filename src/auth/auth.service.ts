import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─── Registration ──────────────────────────────────────────────
  async register(dto: RegisterDto) {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email is already in use');
    }
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
    });

    const payload = { sub: user.id, email: user.email, name: user.name };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // ─── Login ─────────────────────────────────────────────────────
  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('No account found with this email address');
    }
    if (!user.password) {
      throw new UnauthorizedException('This account uses Google sign-in. Please continue with Google');
    }
    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Incorrect password');
    }
    const payload = { sub: user.id, email: user.email, name: user.name };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // ─── Refresh Access Token ───────────────────────────────────────
  async refreshTokens(refreshToken: string) {
    try {
      const decoded = this.jwtService.verify(refreshToken);
      const user = await this.usersService.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const payload = { sub: user.id, email: user.email, name: user.name };
      const accessToken = this.jwtService.sign(payload, {
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as '15m',
      });
      const newRefreshToken = this.jwtService.sign(payload, {
        expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as '7d',
      });

      return {
        access_token: accessToken,
        refresh_token: newRefreshToken,
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─── Credential Validation ─────────────────────────────────────
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) return null;
    const isMatch = await bcrypt.compare(password, user.password);
    return isMatch ? user : null;
  }

  // ─── Google OAuth ──────────────────────────────────────────────
  async validateGoogleUser(googleUser: {
    googleId: string;
    name: string;
    email: string;
  }) {
    // Check by Google ID first
    let user = await this.usersService.findByGoogleId(googleUser.googleId);
    if (user) return user;

    // Check by email — link Google if account exists
    user = await this.usersService.findByEmail(googleUser.email);
    if (user) {
      // If user exists but doesn't have Google ID, link it
      if (!user.googleId) {
        return this.usersService.linkGoogleAccount(user.id, googleUser.googleId);
      }
      // If user already has Google ID (different account), return existing user
      return user;
    }

    // Create new Google-based account
    return this.usersService.create({
      name: googleUser.name,
      email: googleUser.email,
      googleId: googleUser.googleId,
    });
  }

  async googleLogin(googleUser: {
    googleId: string;
    name: string;
    email: string;
  }) {
    const user = await this.validateGoogleUser(googleUser);
    const payload = { sub: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '15m') as '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as '7d',
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  // ─── Logout ────────────────────────────────────────────────────
  logout() {
    return { message: 'Logged out successfully' };
  }
}
