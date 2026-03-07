import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService, OAuthProfile } from '../users/users.service';
import { UserDocument } from '../schemas/user.schema';
import { IJwtPayload } from '@app/common';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

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

  private async generateTokens(user: UserDocument) {
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
    };
  }
}
