import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema.js';
import { BaseRepository } from '../../common/repositories/base.repository.js';
import { IUsersRepository, CreateUserData } from '../interfaces/IUsersRepository.js';

@Injectable()
export class UsersRepository
  extends BaseRepository<UserDocument, CreateUserData>
  implements IUsersRepository
{
  private readonly _userModel: Model<UserDocument>;

  constructor(
    @InjectModel(User.name)
    userModel: Model<UserDocument>,
  ) {
    super(userModel);
    this._userModel = userModel;
  }

  // ─── Schema field mapping (hashedPassword → password) ───────────────────────
  // BaseRepository.create() passes data directly to `new Model(data)`.
  // Our schema field is `password`, but CreateUserData uses `hashedPassword`
  // to make the contract explicit. We map here without changing behaviour.
  override async create(data: CreateUserData): Promise<UserDocument> {
    const doc = new this._userModel({
      name: data.name,
      email: data.email,
      password: data.hashedPassword ?? null,
      googleId: data.googleId ?? null,
    });
    return doc.save() as Promise<UserDocument>;
  }

  // ─── Domain-specific queries ─────────────────────────────────────────────────

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this._userModel.findOne({ email }).exec();
  }

  async findByGoogleId(googleId: string): Promise<UserDocument | null> {
    return this._userModel.findOne({ googleId }).exec();
  }

  async findByRefreshToken(refreshToken: string): Promise<UserDocument | null> {
    return this._userModel.findOne({ refreshToken }).exec();
  }

  async updateRefreshToken(
    userId: string,
    refreshToken: string | null,
  ): Promise<void> {
    await this._userModel.findByIdAndUpdate(userId, { refreshToken }).exec();
  }

  async linkGoogleAccount(
    userId: string,
    googleId: string,
  ): Promise<UserDocument> {
    const user = await this._userModel.findByIdAndUpdate(
      userId,
      { googleId },
      { new: true },
    );
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
