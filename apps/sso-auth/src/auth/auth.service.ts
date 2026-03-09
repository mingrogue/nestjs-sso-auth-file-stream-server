import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { UsersService, OAuthProfile } from '../users/users.service';
import { UserDocument } from '../schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';
import { IJwtPayload } from '@app/common';

@Injectable()
export class AuthService {
  private readonly refreshTokenExpiry: number;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
  ) {
    this.refreshTokenExpiry = this.configService.get<number>('REFRESH_TOKEN_EXPIRY', 7 * 24 * 60 * 60 * 1000); // 7 days default
  }

  async validateOAuthLogin(profile: OAuthProfile) {
    const user = await this.usersService.findOrCreate(profile);
    const tokens = await this.generateTokens(user);
    
    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        picture: user.picture,
        roles: user.roles,
      },
      ...tokens,
    };
  }

  async validateToken(token: string) {
    try {
      const payload = this.jwtService.verify<IJwtPayload>(token);
      const user = await this.usersService.findById(payload.sub);
      
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return {
        valid: true,
        user: {
          id: user._id.toString(),
          email: user.email,
          username: user.username,
          picture: user.picture,
          roles: user.roles,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async refreshAccessToken(refreshToken: string) {
    const tokenDoc = await this.refreshTokenModel.findOne({
      token: refreshToken,
      revoked: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.usersService.findById(tokenDoc.userId.toString());
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new access token
    const payload: IJwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        picture: user.picture,
        roles: user.roles,
      },
    };
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    await this.refreshTokenModel.findOneAndDelete(
      {token: refreshToken}
    );
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.refreshTokenModel.deleteMany(
      { userId: new Types.ObjectId(userId) }
    );
  }

  async validateLocalUser(username: string, password: string): Promise<UserDocument | null> {
    const user = await this.usersService.findByUsernameOrEmail(username);
    if (!user) {
      return null;
    }

    const isValid = await this.usersService.validatePassword(user, password);
    if (!isValid) {
      return null;
    }

    user.lastLoginAt = new Date();
    await user.save();
    return user;
  }

  async register(email: string, username: string, password: string) {
    const user = await this.usersService.createLocalUser(email, username, password);
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        picture: user.picture,
        roles: user.roles,
      },
      ...tokens,
    };
  }

  async loginLocal(user: UserDocument) {
    const tokens = await this.generateTokens(user);

    return {
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        picture: user.picture,
        roles: user.roles,
      },
      ...tokens,
    };
  }

  private async generateTokens(user: UserDocument, userAgent?: string, ipAddress?: string) {
    const payload: IJwtPayload = {
      sub: user._id.toString(),
      email: user.email,
      username: user.username,
      roles: user.roles,
    };

    const accessToken = this.jwtService.sign(payload);

    // Generate refresh token
    const refreshToken = randomBytes(64).toString('hex');
    const expiresAt = new Date(Date.now() + this.refreshTokenExpiry);

    const existingToken = await this.refreshTokenModel.findOne({
      userId: user._id,
    });

    if(existingToken){
      existingToken.updateOne({
        token: refreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      });

      await existingToken.save();
    }else {
      await this.refreshTokenModel.create({
        userId: user._id,
        token: refreshToken,
        expiresAt,
        userAgent,
        ipAddress,
      });
    }

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<number>('JWT_EXPIRATION', 3600),
    };
  }
}
