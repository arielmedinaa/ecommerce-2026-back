import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Landing } from '@landings/schemas/landings.schemas';
import { LandingsService } from '@landings/service/landings.service';
import { Formato } from '@landings/schemas/formatos.schema';

@Controller()
export class LandingsController {
  constructor(private readonly landingsService: LandingsService) {}

  @MessagePattern({ cmd: 'crearLanding' })
  async crearLanding(@Payload() payload: any): Promise<Landing> {
    const { createLandingDto, usuario } = payload;
    return this.landingsService.crearLanding(createLandingDto, usuario);
  }

  @MessagePattern({ cmd: 'getAllLandings' })
  async getAllLandings(
    @Payload() payload: any,
  ): Promise<{ landings: Landing[]; total: number; pages: number }> {
    const { page, limit, filters } = payload;
    return this.landingsService.getAllLandings(page, limit, filters);
  }

  @MessagePattern({ cmd: 'getActiveLandings' })
  async getActiveLandings(@Payload() payload: any): Promise<{
    landings: Landing[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    const { page, limit } = payload;
    return this.landingsService.getActiveLandings(page, limit);
  }

  @MessagePattern({ cmd: 'getLandingById' })
  async getLandingById(@Payload() payload: any): Promise<Landing> {
    const { id } = payload;
    return this.landingsService.getLandingById(id);
  }

  @MessagePattern({ cmd: 'updateLanding' })
  async updateLanding(@Payload() payload: any): Promise<Landing> {
    const { id, updateLandingDto, userId } = payload;
    return this.landingsService.updateLanding(id, updateLandingDto, userId);
  }

  @MessagePattern({ cmd: 'getAllFormatos' })
  async getAllFormatos(
    @Payload() payload: any,
  ): Promise<{ formatos: Formato[]; total: number; pages: number }> {
    const { page, limit, filters } = payload;
    return this.landingsService.getAllFormatos(page, limit, filters);
  }
}
