import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { HomeSectionsService } from '../service/home-sections.service';
import { UpsertHomeSectionDto } from '../dto/upsert-home-section.dto';

@Controller()
export class HomeSectionsController {
  constructor(private readonly homeSectionsService: HomeSectionsService) {}

  @MessagePattern({ cmd: 'list_home_sections' })
  async list() {
    return {
      data: await this.homeSectionsService.listAll(),
      success: true,
      message: 'SECCIONES DEL HOME',
    };
  }

  @MessagePattern({ cmd: 'upsert_home_section' })
  async upsert(@Payload() dto: UpsertHomeSectionDto) {
    const saved = await this.homeSectionsService.upsertByKey(dto.key, dto as any);
    return {
      data: saved,
      success: !!saved,
      message: saved ? 'SECCION GUARDADA' : 'NO SE PUDO GUARDAR LA SECCION',
    };
  }

  @MessagePattern({ cmd: 'upsert_home_section_by_key' })
  async upsertByKey(
    @Payload() payload: { key: string } & Omit<UpsertHomeSectionDto, 'key'>,
  ) {
    const saved = await this.homeSectionsService.upsertByKey(payload.key, payload as any);
    return {
      data: saved,
      success: !!saved,
      message: saved ? 'SECCION GUARDADA' : 'NO SE PUDO GUARDAR LA SECCION',
    };
  }
}
