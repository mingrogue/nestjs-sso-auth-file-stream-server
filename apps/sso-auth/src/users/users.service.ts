import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';

export interface OAuthProfile {
  provider: string;
  providerId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  picture?: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findOrCreate(profile: OAuthProfile): Promise<UserDocument> {
    // Check if user exists by provider + providerId
    let user = await this.findByProviderId(profile.provider, profile.providerId);
    
    if (user) {
      // Update user info from provider
      user.email = profile.email;
      user.picture = profile.picture;
      user.lastLoginAt = new Date();
      await user.save();
      this.logger.log(`User logged in: ${user.email} via ${profile.provider}`);
      return user;
    }

    // Check if user exists by email (could link accounts in future)
    user = await this.findByEmail(profile.email);
    if (user) {
      // Update provider info for existing email
      user.provider = profile.provider;
      user.providerId = profile.providerId;
      user.picture = profile.picture;
      user.lastLoginAt = new Date();
      await user.save();
      this.logger.log(`User account linked: ${user.email} to ${profile.provider}`);
      return user;
    }

    // Create new user
    const newUser = new this.userModel({
      email: profile.email,
      username: profile.username || profile.firstName || profile.email.split('@')[0],
      firstName: profile.firstName,
      lastName: profile.lastName,
      picture: profile.picture,
      provider: profile.provider,
      providerId: profile.providerId,
      roles: ['user'],
      lastLoginAt: new Date(),
    });

    await newUser.save();
    this.logger.log(`New user created: ${newUser.email} via ${profile.provider}`);
    return newUser;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByProviderId(provider: string, providerId: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ provider, providerId }).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { lastLoginAt: new Date() }).exec();
  }
}
