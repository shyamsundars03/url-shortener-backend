import { UserDocument } from '../schemas/user.schema.js';
import { RegisterDto } from '../dto/register.dto.js';
import { LoginDto } from '../dto/login.dto.js';

/** DI injection token — use this to inject IAuthService */
export const AUTH_SERVICE = 'AUTH_SERVICE';

/** Shape of the token pair returned by auth operations */
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

/** Google user data provided by Passport after OAuth callback */
export interface GoogleUserData {
  googleId: string;
  name: string;
  email: string;
}

/**
 * Abstraction for all authentication business logic.
 * AuthController depends on this interface, not on the concrete AuthService.
 * Follows the Dependency Inversion Principle (DIP).
 */
export interface IAuthService {
  /** Register a new user and return JWT token pair */
  register(dto: RegisterDto): Promise<AuthTokens>;

  /** Validate credentials and return JWT token pair */
  login(dto: LoginDto): Promise<AuthTokens>;

  /** Issue a new access/refresh token pair from a valid refresh token */
  refreshTokens(refreshToken: string): Promise<AuthTokens>;

  /** Validate email + password — returns user or null (used by Passport local) */
  validateUser(email: string, password: string): Promise<UserDocument | null>;

  /** Find or create a user from Google OAuth profile data */
  validateGoogleUser(googleUser: GoogleUserData): Promise<UserDocument>;

  /** Perform Google OAuth login and return JWT token pair */
  googleLogin(googleUser: GoogleUserData): Promise<AuthTokens>;

  /** Clear session — returns a confirmation message */
  logout(): { message: string };
}
