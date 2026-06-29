import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In, FindOptionsWhere } from 'typeorm';
import { Landing } from '@content/landings/schemas/landings.schemas';
import { Formato } from '@content/landings/schemas/formatos.schema';
import { FORMATOS_TEMPLATES } from '@content/landings/const/formatos.const';
import { LandingValidationService } from './landings.service.spec';
import { LandingErrorService } from './errors/landings-error.service';

@Injectable()
export class LandingsService {
  private readonly logger = new Logger(LandingsService.name);

  constructor(
    @InjectRepository(Landing, 'WRITE_CONNECTION') private landingRepo: Repository<Landing>,
    @InjectRepository(Landing, 'READ_CONNECTION') private landingReadRepo: Repository<Landing>,
    @InjectRepository(Formato, 'WRITE_CONNECTION') private formatoRepo: Repository<Formato>,
    @InjectRepository(Formato, 'READ_CONNECTION') private formatoReadRepo: Repository<Formato>,
    private readonly landingValidationService: LandingValidationService,
    private readonly landingErrorService: LandingErrorService,
  ) {}

  async crearLanding(createLandingDto: any, userId: string): Promise<{
    data: {};
    message?: any;
  }> {
    const validation =
      await this.landingValidationService.validateCreateLanding(
        createLandingDto,
        userId,
      );

    if (!validation.isValid) {
      return {
        data: {},
        message: validation.error,
      };
    }

    try {
      const titleExists = await this.titleExists(createLandingDto.title);
      if (titleExists) {
        throw new BadRequestException(
          'Ya existe una landing con un título similar. Por favor, usa un título diferente.',
        );
      }

      const landing = this.landingRepo.create({
        ...createLandingDto,
        createdBy: userId,
        slug: this.generateUniqueSlug(createLandingDto.title),
        tituloRelacionado: this.normalizeText(createLandingDto.title),
      });

      const savedLanding = await this.landingRepo.save(landing);
      return {
        data: savedLanding,
        message: 'LANDING CREADA EXITOSAMENTE',
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'crearLanding',
        { createLandingDto, userId },
      );
      
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      throw new BadRequestException('Error al crear la landing');
    }
  }

  async getAllLandings(
    page = 1,
    limit = 10,
    filters?: any,
  ): Promise<{
    landings: Landing[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query = this.buildQuery(filters);

      const [landings, total] = await this.landingReadRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      return {
        landings,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getAllLandings',
        { page, limit, filters },
      );
      throw new BadRequestException('Error al obtener las landings');
    }
  }

  async getActiveLandings(
    page = 1,
    limit = 10,
  ): Promise<{
    landings: Landing[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query = {
        isActive: true,
        isPublished: true,
      };

      const [landings, total] = await this.landingReadRepo.findAndCount({
        where: query,
        order: { createdAt: 'DESC' },
        skip,
        take: limit,
      });

      return {
        landings,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getActiveLandings',
        { page, limit },
      );
      throw new BadRequestException('Error al obtener las landings activas');
    }
  }

  async getLandingById(id: number): Promise<Landing> {
    try {
      const landing = await this.landingReadRepo.findOne({ where: { id } });

      if (!landing) {
        throw new NotFoundException('Landing no encontrada');
      }

      return landing;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getLandingById',
        { id },
      );
      throw error;
    }
  }

  async getLandingBySlug(slug: string): Promise<Landing> {
    try {
      const landing = await this.landingReadRepo.findOne({ where: { slug } });

      if (!landing) {
        throw new NotFoundException('Landing no encontrada');
      }
      await this.landingRepo.increment({ id: landing.id }, 'viewCount', 1);

      return landing;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getLandingBySlug',
        { slug },
      );
      throw error;
    }
  }

  async updateLanding(
    id: number,
    updateLandingDto: any,
    userId: string,
  ): Promise<Landing> {
    try {
      const landing = await this.getLandingById(id);
      
      if (updateLandingDto.title && updateLandingDto.title !== landing.title) {
        updateLandingDto.slug = this.generateUniqueSlug(updateLandingDto.title);
        updateLandingDto.tituloRelacionado = this.normalizeText(updateLandingDto.title);
      }

      await this.landingRepo.update(id, {
        ...updateLandingDto,
        updatedBy: userId,
        updatedAt: new Date(),
      });

      const updatedLanding = await this.getLandingById(id);
      this.logger.log(`Landing actualizada: ${id}`);
      return updatedLanding;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'updateLanding',
        { id, updateLandingDto, userId },
      );
      throw new BadRequestException('Error al actualizar la landing');
    }
  }

  async deleteLanding(id: string): Promise<void> {
    try {
      await this.landingRepo.update(id, {
        isActive: false,
        updatedAt: new Date(),
      });

      this.logger.log(`Landing eliminada (soft delete): ${id}`);
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'deleteLanding',
        { id },
      );
      throw error;
    }
  }

  async togglePublishLanding(id: number, userId: string): Promise<Landing> {
    try {
      const landing = await this.getLandingById(id);
      
      await this.landingRepo.update(id, {
        isPublished: !landing.isPublished,
        publicadoEn: !landing.isPublished ? new Date() : null,
        updatedBy: userId,
        updatedAt: new Date(),
      });

      const updatedLanding = await this.getLandingById(id);
      this.logger.log(
        `Landing ${!landing.isPublished ? 'publicada' : 'despublicada'}: ${id}`,
      );
      return updatedLanding;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'togglePublishLanding',
        { id, userId },
      );
      throw new BadRequestException('Error al cambiar estado de publicación');
    }
  }

  // ==================== MÉTODOS DE FORMATOS ====================

  async getAllFormatos(
    page = 1,
    limit = 10,
    filters?: any,
  ): Promise<{
    formatos: Formato[];
    total: number;
    pages: number;
    currentPage: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const query = this.buildFormatosQuery(filters);

      const [formatos, total] = await this.formatoReadRepo.findAndCount({
        where: query,
        order: { sortOrder: 'ASC', createdAt: 'DESC' },
        skip,
        take: limit,
      });

      return {
        formatos,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getAllFormatos',
        { page, limit, filters },
      );
      throw new BadRequestException('Error al obtener los formatos');
    }
  }

  async getActiveFormatos(): Promise<Formato[]> {
    try {
      return await this.formatoReadRepo.find({
        where: { isActive: true },
        order: { sortOrder: 'ASC', usageCount: 'DESC' },
      });
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getActiveFormatos',
        {},
      );
      throw new BadRequestException('Error al obtener los formatos activos');
    }
  }

  async getFormatoById(id: string): Promise<Formato> {
    try {
      const formato = await this.formatoReadRepo.findOne({ where: { id } });

      if (!formato) {
        throw new NotFoundException('Formato no encontrado');
      }

      return formato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getFormatoById',
        { id },
      );
      throw error;
    }
  }

  async getFormatoBySlug(slug: string): Promise<Formato> {
    try {
      const formato = await this.formatoReadRepo.findOne({ where: { slug, isActive: true } });

      if (!formato) {
        throw new NotFoundException('Formato no encontrado');
      }
      await this.formatoRepo.increment({ id: formato.id }, 'usageCount', 1);

      return formato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getFormatoBySlug',
        { slug },
      );
      throw error;
    }
  }

  async createFormato(createFormatoDto: any, userId: string): Promise<Formato> {
    try {
      const formatoData: any = {
        ...createFormatoDto,
        createdBy: userId,
        slug: this.generateUniqueSlug(createFormatoDto.name, 'formato'),
      };
      const formato = this.formatoRepo.create(formatoData as Formato);

      const savedFormato = await this.formatoRepo.save(formato);

      this.logger.log(`Formato creado exitosamente: ${savedFormato.id}`);
      return savedFormato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'createFormato',
        { createFormatoDto, userId },
      );
      throw new BadRequestException('Error al crear el formato');
    }
  }

  async updateFormato(
    id: string,
    updateFormatoDto: any,
    userId: string,
  ): Promise<Formato> {
    try {
      const formato = await this.getFormatoById(id);

      if (updateFormatoDto.name && updateFormatoDto.name !== formato.name) {
        updateFormatoDto.slug = this.generateUniqueSlug(
          updateFormatoDto.name,
          'formato',
        );
      }

      await this.formatoRepo.update(id, {
        ...updateFormatoDto,
        updatedBy: userId,
        updatedAt: new Date(),
      });

      const updatedFormato = await this.getFormatoById(id);
      this.logger.log(`Formato actualizado: ${id}`);
      return updatedFormato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'updateFormato',
        { id, updateFormatoDto, userId },
      );
      throw new BadRequestException('Error al actualizar el formato');
    }
  }

  async deleteFormato(id: string): Promise<void> {
    try {
      await this.formatoRepo.update(id, {
        isActive: false,
        updatedAt: new Date(),
      });

      this.logger.log(`Formato eliminado: ${id}`);
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'deleteFormato',
        { id },
      );
      throw error;
    }
  }

  async getPredefinedTemplates(): Promise<any> {
    try {
      return FORMATOS_TEMPLATES;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getPredefinedTemplates',
        {},
      );
      throw new BadRequestException(
        'Error al obtener los templates predefinidos',
      );
    }
  }

  async importTemplate(templateKey: string, userId: string): Promise<Formato> {
    try {
      const template = FORMATOS_TEMPLATES[templateKey];

      if (!template) {
        throw new NotFoundException('Template no encontrado');
      }

      const existingFormato = await this.formatoReadRepo.findOne({
        where: { slug: template.slug }
      });
      if (existingFormato) {
        throw new BadRequestException('Ya existe un formato con este slug');
      }

      const formato = this.formatoRepo.create({
        name: template.name,
        slug: template.slug,
        description: template.description,
        template: template.template,
        type: template.type as 'html'|'react'|'jsx',
        category: template.category,
        tags: template.tags,
        config: template.config,
        variables: template.variables,
        isActive: true,
        isPremium: false,
        usageCount: 0,
        createdBy: userId,
        sortOrder: 0,
      });

      const savedFormato = await this.formatoRepo.save(formato);

      this.logger.log(
        `Template importado como formato: ${templateKey} -> ${savedFormato.id}`,
      );
      return savedFormato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'importTemplate',
        { templateKey, userId },
      );
      throw error;
    }
  }

  async getLandingsStats(): Promise<any> {
    try {
      const totalLandings = await this.landingReadRepo.count();
      const activeLandings = await this.landingReadRepo.count({ where: { isActive: true } });
      const publishedLandings = await this.landingReadRepo.count({ where: { isPublished: true } });
      
      const viewsResult = await this.landingReadRepo
        .createQueryBuilder('landing')
        .select('SUM(landing.viewCount)', 'total')
        .getRawOne();
      const totalViews = viewsResult?.total ? Number(viewsResult.total) : 0;

      const recentLandings = await this.landingReadRepo.find({
        where: { isActive: true },
        order: { createdAt: 'DESC' },
        take: 5,
        select: ['title', 'slug', 'createdAt', 'viewCount']
      });

      return {
        totalLandings,
        activeLandings,
        publishedLandings,
        totalViews,
        recentLandings,
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getLandingsStats',
        {},
      );
      throw new BadRequestException('Error al obtener estadísticas');
    }
  }

  async getFormatosStats(): Promise<any> {
    try {
      const totalFormatos = await this.formatoReadRepo.count();
      const activeFormatos = await this.formatoReadRepo.count({ where: { isActive: true } });
      const premiumFormatos = await this.formatoReadRepo.count({ where: { isPremium: true } });
      
      const usagesResult = await this.formatoReadRepo
        .createQueryBuilder('formato')
        .select('SUM(formato.usageCount)', 'total')
        .getRawOne();
      const totalUsages = usagesResult?.total ? Number(usagesResult.total) : 0;

      const popularFormatos = await this.formatoReadRepo.find({
        where: { isActive: true },
        order: { usageCount: 'DESC' },
        take: 5,
        select: ['name', 'slug', 'usageCount', 'category']
      });

      return {
        totalFormatos,
        activeFormatos,
        premiumFormatos,
        totalUsages,
        popularFormatos,
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error as Error,
        '',
        'getFormatosStats',
        {},
      );
      throw new BadRequestException(
        'Error al obtener estadísticas de formatos',
      );
    }
  }

  private generateUniqueSlug(title: string, prefix = 'landing'): string {
    const baseSlug = this.normalizeText(title).replace(/\s+/g, '-').trim();

    const timestamp = Date.now().toString(36);
    return `${prefix}-${baseSlug}-${timestamp}`;
  }

  private buildQuery(filters: any): FindOptionsWhere<Landing> | FindOptionsWhere<Landing>[] {
    const query: FindOptionsWhere<Landing> = {};

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    if (filters?.createdBy) {
      query.createdBy = filters.createdBy;
    }

    if (filters?.search) {
      return [
        { ...query, title: Like(`%${filters.search}%`) },
        { ...query, description: Like(`%${filters.search}%`) },
        { ...query, content: Like(`%${filters.search}%`) },
      ];
    }

    return query;
  }

  private buildFormatosQuery(filters: any): FindOptionsWhere<Formato> | FindOptionsWhere<Formato>[] {
    const query: FindOptionsWhere<Formato> = {};

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.isPremium !== undefined) {
      query.isPremium = filters.isPremium;
    }

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.search) {
      return [
        { ...query, name: Like(`%${filters.search}%`) },
        { ...query, description: Like(`%${filters.search}%`) }
      ];
    }

    return query;
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async titleExists(
    title: string,
    excludeId?: string,
  ): Promise<boolean> {
    const normalizedTitle = this.normalizeText(title);
    const regexPattern = normalizedTitle
      .split(' ')
      .filter((word) => word.length > 0)
      .map((word) => word.replace(/[^a-z0-9]/g, ''))
      .join('%');
      
    const queryBuilder = this.landingReadRepo.createQueryBuilder('landing')
      .where('landing.tituloRelacionado LIKE :pattern', { pattern: `%${regexPattern}%` });

    if (excludeId) {
      queryBuilder.andWhere('landing.id != :excludeId', { excludeId });
    }

    const existing = await queryBuilder.getOne();
    return !!existing;
  }
}
