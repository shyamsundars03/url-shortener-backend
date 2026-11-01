import { UserDocument } from '../schemas/user.schema.js';
import { IBaseRepository } from '../../common/repositories/IBaseRepository.js';

/** DI injection token — use this to inject IUsersRepository */
export const USERS_REPOSITORY = 'USERS_REPOSITORY';

/** Data shape required to create a new user (password must already be hashed) */
export interface CreateUserData {
  name: string;
  email: string;
  hashedPassword?: string | null;
  googleId?: string | null;
}

/**
 * Abstraction for all user-related database operations.
 * Extends IBaseRepository for create, findById, findOne.
 * UsersService depends on this interface, not on the Mongoose Model directly.
 * Follows the Dependency Inversion Principle (DIP).
 */
export interface IUsersRepository extends IBaseRepository<UserDocument, CreateUserData> {
  /** Find a user by their email address */
  findByEmail(email: string): Promise<UserDocument | null>;

  /** Find a user by their Google OAuth ID */
  findByGoogleId(googleId: string): Promise<UserDocument | null>;

  /** Find a user by their stored refresh token */
  findByRefreshToken(refreshToken: string): Promise<UserDocument | null>;

  /** Store or clear a refresh token for a user */
  updateRefreshToken(userId: string, refreshToken: string | null): Promise<void>;

  /** Link a Google account to an existing local user */
  linkGoogleAccount(userId: string, googleId: string): Promise<UserDocument>;
}
