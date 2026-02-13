import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Landing } from '../schemas/landings.schemas';
import { LandingsService } from '../service/landings.service';

@Controller()
export class LandingsController {
  constructor(private readonly landingsService: LandingsService) {}

  @MessagePattern({ cmd: 'crearLanding' })
  async crearLanding(@Payload() payload: any): Promise<Landing> {
    const { createLandingDto, userId } = payload;
    return this.landingsService.crearLanding(createLandingDto, userId);
  }

  @MessagePattern({ cmd: 'getAllLandings' })
  async getAllLandings(
    @Payload() payload: any,
  ): Promise<{ landings: Landing[]; total: number; pages: number }> {
    const { page, limit, filters } = payload;
    return this.landingsService.getAllLandings(page, limit, filters);
  }

  @MessagePattern({ cmd: 'getLandingById' })
  async getLandingById(@Payload() payload: any): Promise<Landing> {
    const { id } = payload;
    return this.landingsService.getLandingById(id);
  }

  @MessagePattern({ cmd: 'updateLanding' })
  async updateLanding(
    @Payload() payload: any,
  ): Promise<Landing> {
    const { id, updateLandingDto, userId } = payload;
    return this.landingsService.updateLanding(id, updateLandingDto, userId);
  }
}
