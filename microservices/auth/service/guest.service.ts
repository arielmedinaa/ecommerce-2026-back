import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../schemas/user.schema';
import { GuestToken } from '../schemas/guest-token.schema';
import * as crypto from 'crypto';

@Injectable()
export class GuestService {
  private readonly logger = new Logger(GuestService.name);

  constructor(
    @InjectModel(GuestToken.name) private readonly guestTokenModel: Model<GuestToken>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
  ) {}

  async createGuestToken(ipAddress: string, userAgent: string): Promise<{ token: string; user: any }> {
    const token = crypto.randomBytes(32).toString('hex');
    
    const existingGuest = await this.guestTokenModel.findOne({
      ipAddress,
      userAgent,
      isActive: true,
    });

    if (existingGuest) {
      existingGuest.lastUsedAt = new Date();
      await existingGuest.save();
      
      let user = await this.userModel.findOne({ providerId: existingGuest.token, provider: 'guest' });
      if (!user) {
        user = await this.userModel.create({
          email: `guest_${existingGuest.token}@guest.local`,
          provider: 'guest',
          providerId: existingGuest.token,
          name: 'Guest User',
        });
      }

      return { token: existingGuest.token, user };
    }

    const guestToken = await this.guestTokenModel.create({
      token,
      ipAddress,
      userAgent,
      isActive: true,
    });

    const user = await this.userModel.create({
      email: `guest_${token}@guest.local`,
      provider: 'guest',
      providerId: token,
      name: 'Guest User',
    });

    this.logger.log(`Created guest token for IP: ${ipAddress}`);
    return { token, user };
  }

  async validateGuestToken(token: string, ipAddress: string): Promise<User | null> {
    const guestToken = await this.guestTokenModel.findOne({
      token,
      ipAddress,
      isActive: true,
    });

    if (!guestToken) {
      return null;
    }

    if (guestToken.expiresAt < new Date()) {
      guestToken.isActive = false;
      await guestToken.save();
      return null;
    }

    guestToken.lastUsedAt = new Date();
    await guestToken.save();

    return this.userModel.findOne({ providerId: token, provider: 'guest' });
  }

  async revokeGuestToken(token: string): Promise<void> {
    await this.guestTokenModel.updateOne(
      { token },
      { isActive: false }
    );
  }
}
