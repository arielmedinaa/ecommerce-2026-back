import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateGoogleUser(profile: any): Promise<User> {
    const { providerId, email, name, avatar } = profile;

    let user = await this.userModel.findOne({ providerId, provider: 'google' });
    
    if (!user) {
      user = await this.userModel.create({
        email,
        name,
        avatar,
        provider: 'google',
        providerId,
        lastLoginAt: new Date(),
      });
      this.logger.log(`Created new Google user: ${email}`);
    } else {
      user.lastLoginAt = new Date();
      await user.save();
    }

    return user;
  }

  async login(user: any) {
    const payload = {
      sub: user._id,
      email: user.email,
      provider: user.provider,
      name: user.name,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        provider: user.provider,
        avatar: user.avatar,
      },
    };
  }

  async extractTokenFromContext(context: any): Promise<string | null> {
    const request =
      context.getArgByIndex(1)?.req || context.switchToHttp()?.getRequest();

    if (!request?.headers?.authorization) {
      this.logger.warn('No authorization header found');
      return null;
    }
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : null;
  }

  async validateToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      return null;
    }
  }
}
