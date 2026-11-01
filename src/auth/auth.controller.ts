import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { IAuthService, AUTH_SERVICE, AuthTokens } from './interfaces/IAuthService.js';
import { ApiResponse } from '../common/response/api-response.js';
import { AUTH_ROUTES } from '../common/constants/api-routes.constant.js';

interface GoogleOAuthUser {
  googleId: string;
  name: string;
  email: string;
}

@Controller(AUTH_ROUTES.BASE)
export class AuthController {
  private readonly _authService: IAuthService;

  constructor(
    @Inject(AUTH_SERVICE)
    authService: IAuthService,
  ) {
    this._authService = authService;
  }

  @Post(AUTH_ROUTES.REGISTER)
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
  ): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this._authService.register(dto);
    return ApiResponse.created(tokens, 'Registration successful');
  }

  @Get(AUTH_ROUTES.REGISTER)
  async registerPage(@Res() res: Response): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/register`);
  }

  @Post(AUTH_ROUTES.LOGIN)
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this._authService.login(dto);
    return ApiResponse.ok(tokens, 'Login successful');
  }

  @Get(AUTH_ROUTES.LOGIN)
  async loginPage(@Res() res: Response): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/login`);
  }

  @Post(AUTH_ROUTES.REFRESH)
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: { refresh_token: string },
  ): Promise<ApiResponse<AuthTokens>> {
    const tokens = await this._authService.refreshTokens(body.refresh_token);
    return ApiResponse.ok(tokens, 'Token refreshed successfully');
  }

  @Post(AUTH_ROUTES.LOGOUT)
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  logout(): ApiResponse<{ message: string }> {
    const result = this._authService.logout();
    return ApiResponse.ok(result, 'Logged out successfully');
  }

  @Get(AUTH_ROUTES.GOOGLE)
  @UseGuards(AuthGuard('google'))
  googleAuth(): void {
    // Passport redirects to Google — no body needed
  }

  @Get(AUTH_ROUTES.GOOGLE_CALLBACK)
  @UseGuards(AuthGuard('google'))
  async googleCallback(
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const googleUser = req.user as GoogleOAuthUser;
    const result = await this._authService.googleLogin(googleUser);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(
      `${frontendUrl}/auth/callback?token=${result.access_token}&refresh=${result.refresh_token}`,
    );
  }

  @Get(AUTH_ROUTES.CALLBACK)
  async callback(@Req() req: Request, @Res() res: Response): Promise<void> {
    const token = req.query.token as string;
    const refresh = req.query.refresh as string;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    if (token) {
      res.redirect(`${frontendUrl}/?token=${token}&refresh=${refresh}`);
    } else {
      res.redirect(`${frontendUrl}/login`);
    }
  }
}
