import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Landing, LandingDocument } from '../schemas/landings.schemas';
import { Formato, FormatoDocument } from '../schemas/formatos.schema';
import { FORMATOS_TEMPLATES } from '../const/formatos.const';
import { LandingValidationService } from './landings.service.spec';
import { LandingErrorService } from './errors/landings-error.service';

@Injectable()
export class LandingsService {
  private readonly logger = new Logger(LandingsService.name);

  constructor(
    @InjectModel(Landing.name) private landingModel: Model<LandingDocument>,
    @InjectModel(Formato.name) private formatoModel: Model<FormatoDocument>,
    private readonly landingValidationService: LandingValidationService,
    private readonly landingErrorService: LandingErrorService,
  ) {}

  async crearLanding(createLandingDto: any, userId: string): Promise<Landing> {
    const validation =
      await this.landingValidationService.validateCreateLanding(
        createLandingDto,
        userId,
      );

    if (!validation.isValid) {
      return validation.error;
    }

    try {
      const titleExists = await this.titleExists(createLandingDto.title);
      if (titleExists) {
        throw new BadRequestException(
          'Ya existe una landing con un título similar. Por favor, usa un título diferente.',
        );
      }

      const landing = new this.landingModel({
        ...createLandingDto,
        createdBy: new Types.ObjectId(userId),
        slug: this.generateUniqueSlug(createLandingDto.title),
        tituloRelacionado: this.normalizeText(createLandingDto.title),
      });

      const savedLanding = await landing.save();
      return savedLanding;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'crearLanding',
        { createLandingDto, userId },
      );
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

      const [landings, total] = await Promise.all([
        this.landingModel
          .find(query)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.landingModel.countDocuments(query),
      ]);

      return {
        landings,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
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

      const [landings, total] = await Promise.all([
        this.landingModel
          .find(query)
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.landingModel.countDocuments(query),
      ]);

      return {
        landings,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'getActiveLandings',
        { page, limit },
      );
      throw new BadRequestException('Error al obtener las landings activas');
    }
  }

  async getLandingById(id: string): Promise<Landing> {
    try {
      const landing = await this.landingModel
        .findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .exec();

      if (!landing) {
        throw new NotFoundException('Landing no encontrada');
      }

      return landing;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'getLandingById',
        { id },
      );
      throw error;
    }
  }

  async getLandingBySlug(slug: string): Promise<Landing> {
    try {
      const landing = await this.landingModel
        .findOne({ slug })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .exec();

      if (!landing) {
        throw new NotFoundException('Landing no encontrada');
      }
      await this.landingModel.findByIdAndUpdate(landing._id, {
        $inc: { viewCount: 1 },
      });

      return landing;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'getLandingBySlug',
        { slug },
      );
      throw error;
    }
  }

  async updateLanding(
    id: string,
    updateLandingDto: any,
    userId: string,
  ): Promise<Landing> {
    try {
      const landing = await this.getLandingById(id);
      if (updateLandingDto.title && updateLandingDto.title !== landing.title) {
        updateLandingDto.slug = this.generateUniqueSlug(updateLandingDto.title);
      }

      const updatedLanding: any = await this.landingModel
        .findByIdAndUpdate(
          id,
          {
            ...updateLandingDto,
            updatedBy: new Types.ObjectId(userId),
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .exec();

      this.logger.log(`Landing actualizada: ${id}`);
      return updatedLanding;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'updateLanding',
        { id, updateLandingDto, userId },
      );
      throw new BadRequestException('Error al actualizar la landing');
    }
  }

  async deleteLanding(id: string): Promise<void> {
    try {
      const landing = await this.getLandingById(id);
      await this.landingModel.findByIdAndUpdate(id, {
        isActive: false,
        updatedAt: new Date(),
      });

      this.logger.log(`Landing eliminada (soft delete): ${id}`);
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'deleteLanding',
        { id },
      );
      throw error;
    }
  }

  async togglePublishLanding(id: string, userId: string): Promise<Landing> {
    try {
      const landing = await this.getLandingById(id);
      const updatedLanding: any = await this.landingModel
        .findByIdAndUpdate(
          id,
          {
            isPublished: !landing.isPublished,
            publishedAt: !landing.isPublished ? new Date() : undefined,
            updatedBy: new Types.ObjectId(userId),
            updatedAt: new Date(),
          },
          { new: true },
        )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .exec();

      this.logger.log(
        `Landing ${!landing.isPublished ? 'publicada' : 'despublicada'}: ${id}`,
      );
      return updatedLanding;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
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

      const [formatos, total] = await Promise.all([
        this.formatoModel
          .find(query)
          .populate('createdBy', 'name email')
          .populate('updatedBy', 'name email')
          .sort({ sortOrder: 1, createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.formatoModel.countDocuments(query),
      ]);

      return {
        formatos,
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'getAllFormatos',
        { page, limit, filters },
      );
      throw new BadRequestException('Error al obtener los formatos');
    }
  }

  async getActiveFormatos(): Promise<Formato[]> {
    try {
      return await this.formatoModel
        .find({ isActive: true })
        .sort({ sortOrder: 1, usageCount: -1 })
        .exec();
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'getActiveFormatos',
        {},
      );
      throw new BadRequestException('Error al obtener los formatos activos');
    }
  }

  async getFormatoById(id: string): Promise<Formato> {
    try {
      const formato = await this.formatoModel
        .findById(id)
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .exec();

      if (!formato) {
        throw new NotFoundException('Formato no encontrado');
      }

      return formato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'getFormatoById',
        { id },
      );
      throw error;
    }
  }

  async getFormatoBySlug(slug: string): Promise<Formato> {
    try {
      const formato = await this.formatoModel
        .findOne({ slug, isActive: true })
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .exec();

      if (!formato) {
        throw new NotFoundException('Formato no encontrado');
      }
      await this.formatoModel.findByIdAndUpdate(formato._id, {
        $inc: { usageCount: 1 },
      });

      return formato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'getFormatoBySlug',
        { slug },
      );
      throw error;
    }
  }

  async createFormato(createFormatoDto: any, userId: string): Promise<Formato> {
    try {
      const formato = new this.formatoModel({
        ...createFormatoDto,
        createdBy: new Types.ObjectId(userId),
        slug: this.generateUniqueSlug(createFormatoDto.name, 'formato'),
      });

      const savedFormato = await formato.save();

      this.logger.log(`Formato creado exitosamente: ${savedFormato._id}`);
      return savedFormato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
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

      const updatedFormato: any = await this.formatoModel
        .findByIdAndUpdate(
          id,
          {
            ...updateFormatoDto,
            updatedBy: new Types.ObjectId(userId),
            updatedAt: new Date(),
          },
          { new: true, runValidators: true },
        )
        .populate('createdBy', 'name email')
        .populate('updatedBy', 'name email')
        .exec();

      this.logger.log(`Formato actualizado: ${id}`);
      return updatedFormato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'updateFormato',
        { id, updateFormatoDto, userId },
      );
      throw new BadRequestException('Error al actualizar el formato');
    }
  }

  async deleteFormato(id: string): Promise<void> {
    try {
      const formato = await this.getFormatoById(id);

      await this.formatoModel.findByIdAndUpdate(id, {
        isActive: false,
        updatedAt: new Date(),
      });

      this.logger.log(`Formato eliminado: ${id}`);
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
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
        error,
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

      const existingFormato = await this.formatoModel.findOne({
        slug: template.slug,
      });
      if (existingFormato) {
        throw new BadRequestException('Ya existe un formato con este slug');
      }

      const formato = new this.formatoModel({
        name: template.name,
        slug: template.slug,
        description: template.description,
        template: template.template,
        type: template.type,
        category: template.category,
        tags: template.tags,
        config: template.config,
        variables: template.variables,
        isActive: true,
        isPremium: false,
        usageCount: 0,
        createdBy: new Types.ObjectId(userId),
        sortOrder: 0,
      });

      const savedFormato = await formato.save();

      this.logger.log(
        `Template importado como formato: ${templateKey} -> ${savedFormato._id}`,
      );
      return savedFormato;
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'importTemplate',
        { templateKey, userId },
      );
      throw error;
    }
  }

  async getLandingsStats(): Promise<any> {
    try {
      const [totalLandings, activeLandings, publishedLandings, totalViews] =
        await Promise.all([
          this.landingModel.countDocuments(),
          this.landingModel.countDocuments({ isActive: true }),
          this.landingModel.countDocuments({ isPublished: true }),
          this.landingModel.aggregate([
            { $group: { _id: null, totalViews: { $sum: '$viewCount' } } },
          ]),
        ]);

      return {
        totalLandings,
        activeLandings,
        publishedLandings,
        totalViews: totalViews[0]?.totalViews || 0,
        recentLandings: await this.landingModel
          .find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(5)
          .select('title slug createdAt viewCount')
          .exec(),
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
        '',
        'getLandingsStats',
        {},
      );
      throw new BadRequestException('Error al obtener estadísticas');
    }
  }

  async getFormatosStats(): Promise<any> {
    try {
      const [totalFormatos, activeFormatos, premiumFormatos, totalUsages] =
        await Promise.all([
          this.formatoModel.countDocuments(),
          this.formatoModel.countDocuments({ isActive: true }),
          this.formatoModel.countDocuments({ isPremium: true }),
          this.formatoModel.aggregate([
            { $group: { _id: null, totalUsages: { $sum: '$usageCount' } } },
          ]),
        ]);

      return {
        totalFormatos,
        activeFormatos,
        premiumFormatos,
        totalUsages: totalUsages[0]?.totalUsages || 0,
        popularFormatos: await this.formatoModel
          .find({ isActive: true })
          .sort({ usageCount: -1 })
          .limit(5)
          .select('name slug usageCount category')
          .exec(),
      };
    } catch (error) {
      await this.landingErrorService.logMicroserviceError(
        error,
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

  private buildQuery(filters: any): any {
    const query: any = {};

    if (filters?.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters?.isPublished !== undefined) {
      query.isPublished = filters.isPublished;
    }

    if (filters?.createdBy) {
      query.createdBy = new Types.ObjectId(filters.createdBy);
    }

    if (filters?.category) {
      query.category = filters.category;
    }

    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters?.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
        { content: { $regex: filters.search, $options: 'i' } },
      ];
    }

    return query;
  }

  private buildFormatosQuery(filters: any): any {
    const query: any = {};

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

    if (filters?.tags && filters.tags.length > 0) {
      query.tags = { $in: filters.tags };
    }

    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
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
    console.log('normalized', normalizedTitle);

    const regexPattern = normalizedTitle
      .split(' ')
      .filter((word) => word.length > 0)
      .map((word) => word.replace(/[^a-z0-9]/g, ''))
      .join('.*');
    const query: any = {
      tituloRelacionado: {
        $regex: new RegExp(`^${regexPattern}$`, 'i'),
      },
    };

    if (excludeId) {
      query._id = { $ne: new Types.ObjectId(excludeId) };
    }

    console.log('query caching', query);

    const existing = await this.landingModel.findOne(query).lean().exec();
    console.log('existing', existing);
    return !!existing;
  }
}
