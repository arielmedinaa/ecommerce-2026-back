import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HomeSection } from '../schemas/home-section.schema';

@Injectable()
export class HomeSectionsService {
  private readonly logger = new Logger(HomeSectionsService.name);

  constructor(
    @InjectRepository(HomeSection, 'WRITE_CONNECTION')
    private readonly homeSectionRepoWrite: Repository<HomeSection>,
    @InjectRepository(HomeSection, 'READ_CONNECTION')
    private readonly homeSectionRepoRead: Repository<HomeSection>,
  ) {}

  async getActiveSections(): Promise<HomeSection[]> {
    try {
      return await this.homeSectionRepoRead.find({
        where: { activo: true },
        order: { orden: 'ASC', id: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error al obtener home sections', error);
      return [];
    }
  }

  async listAll(): Promise<HomeSection[]> {
    try {
      return await this.homeSectionRepoRead.find({
        order: { orden: 'ASC', id: 'ASC' },
      });
    } catch (error) {
      this.logger.error('Error al listar home sections', error);
      return [];
    }
  }

  async upsertByKey(
    key: string,
    data: Partial<HomeSection>,
  ): Promise<HomeSection | null> {
    try {
      const existing = await this.homeSectionRepoWrite.findOne({ where: { key } });
      if (existing) {
        const updatePayload: Partial<HomeSection> = {
          ...data,
          key,
          titulo: data.titulo ?? undefined,
          config: data.config ?? undefined,
        };
        await this.homeSectionRepoWrite.update(existing.id, updatePayload as any);
        return await this.homeSectionRepoWrite.findOne({ where: { id: existing.id } });
      }
      const created = this.homeSectionRepoWrite.create({
        key,
        type: (data.type as any) ?? 'BANNERS',
        orden: data.orden ?? 0,
        activo: data.activo ?? true,
        titulo: data.titulo ?? undefined,
        config: data.config ?? undefined,
      });
      return await this.homeSectionRepoWrite.save(created);
    } catch (error) {
      this.logger.error('Error al upsert home section', error);
      return null;
    }
  }
}
