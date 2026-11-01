import { Injectable, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UserDocument } from './schemas/user.schema.js';
import {
  IUsersRepository,
  USERS_REPOSITORY,
} from './interfaces/IUsersRepository.js';

@Injectable()
export class UsersService {
  private readonly _usersRepository: IUsersRepository;

  constructor(
    @Inject(USERS_REPOSITORY)
    usersRepository: IUsersRepository,
  ) {
    this._usersRepository = usersRepository;
  }

  // ─── Create User (hashing is a service/business concern) ────────────────────
  async create(data: {
    name: string;
    email: string;
    password?: string;
    googleId?: string | null;
  }): Promise<UserDocument> {
    const hashedPassword = data.password
      ? await bcrypt.hash(data.password, 10)
      : null;

    return this._usersRepository.create({
      name: data.name,
      email: data.email,
      hashedPassword,
      googleId: data.googleId ?? null,
    });
  }

  // ─── Lookups ─────────────────────────────────────────────────────────────────

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this._usersRepository.findByEmail(email);
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this._usersRepository.findById(id);
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this._usersRepository.findByGoogleId(googleId);
  }

  async findByRefreshToken(refreshToken: string): Promise<UserDocument | null> {
    return this._usersRepository.findByRefreshToken(refreshToken);
  }

  // ─── Mutations ───────────────────────────────────────────────────────────────

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    return this._usersRepository.updateRefreshToken(userId, refreshToken);
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
  ): Promise<UserDocument> {
    return this._usersRepository.linkGoogleAccount(userId, googleId);
  }
}
