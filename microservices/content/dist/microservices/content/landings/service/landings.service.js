"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var LandingsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.LandingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const landings_schemas_1 = require("../schemas/landings.schemas");
const formatos_schema_1 = require("../schemas/formatos.schema");
const formatos_const_1 = require("../const/formatos.const");
const landings_service_spec_1 = require("./landings.service.spec");
const landings_error_service_1 = require("./errors/landings-error.service");
let LandingsService = LandingsService_1 = class LandingsService {
    constructor(landingRepo, landingReadRepo, formatoRepo, formatoReadRepo, landingValidationService, landingErrorService) {
        this.landingRepo = landingRepo;
        this.landingReadRepo = landingReadRepo;
        this.formatoRepo = formatoRepo;
        this.formatoReadRepo = formatoReadRepo;
        this.landingValidationService = landingValidationService;
        this.landingErrorService = landingErrorService;
        this.logger = new common_1.Logger(LandingsService_1.name);
    }
    async crearLanding(createLandingDto, userId) {
        const validation = await this.landingValidationService.validateCreateLanding(createLandingDto, userId);
        if (!validation.isValid) {
            return {
                data: {},
                message: validation.error,
            };
        }
        try {
            const titleExists = await this.titleExists(createLandingDto.title);
            if (titleExists) {
                throw new common_1.BadRequestException('Ya existe una landing con un título similar. Por favor, usa un título diferente.');
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'crearLanding', { createLandingDto, userId });
            if (error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.BadRequestException('Error al crear la landing');
        }
    }
    async getAllLandings(page = 1, limit = 10, filters) {
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getAllLandings', { page, limit, filters });
            throw new common_1.BadRequestException('Error al obtener las landings');
        }
    }
    async getActiveLandings(page = 1, limit = 10) {
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getActiveLandings', { page, limit });
            throw new common_1.BadRequestException('Error al obtener las landings activas');
        }
    }
    async getLandingById(id) {
        try {
            const landing = await this.landingReadRepo.findOne({ where: { id } });
            if (!landing) {
                throw new common_1.NotFoundException('Landing no encontrada');
            }
            return landing;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getLandingById', { id });
            throw error;
        }
    }
    async getLandingBySlug(slug) {
        try {
            const landing = await this.landingReadRepo.findOne({ where: { slug } });
            if (!landing) {
                throw new common_1.NotFoundException('Landing no encontrada');
            }
            await this.landingRepo.increment({ id: landing.id }, 'viewCount', 1);
            return landing;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getLandingBySlug', { slug });
            throw error;
        }
    }
    async updateLanding(id, updateLandingDto, userId) {
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'updateLanding', { id, updateLandingDto, userId });
            throw new common_1.BadRequestException('Error al actualizar la landing');
        }
    }
    async deleteLanding(id) {
        try {
            await this.landingRepo.update(id, {
                isActive: false,
                updatedAt: new Date(),
            });
            this.logger.log(`Landing eliminada (soft delete): ${id}`);
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'deleteLanding', { id });
            throw error;
        }
    }
    async togglePublishLanding(id, userId) {
        try {
            const landing = await this.getLandingById(id);
            await this.landingRepo.update(id, {
                isPublished: !landing.isPublished,
                publicadoEn: !landing.isPublished ? new Date() : null,
                updatedBy: userId,
                updatedAt: new Date(),
            });
            const updatedLanding = await this.getLandingById(id);
            this.logger.log(`Landing ${!landing.isPublished ? 'publicada' : 'despublicada'}: ${id}`);
            return updatedLanding;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'togglePublishLanding', { id, userId });
            throw new common_1.BadRequestException('Error al cambiar estado de publicación');
        }
    }
    async getAllFormatos(page = 1, limit = 10, filters) {
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getAllFormatos', { page, limit, filters });
            throw new common_1.BadRequestException('Error al obtener los formatos');
        }
    }
    async getActiveFormatos() {
        try {
            return await this.formatoReadRepo.find({
                where: { isActive: true },
                order: { sortOrder: 'ASC', usageCount: 'DESC' },
            });
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getActiveFormatos', {});
            throw new common_1.BadRequestException('Error al obtener los formatos activos');
        }
    }
    async getFormatoById(id) {
        try {
            const formato = await this.formatoReadRepo.findOne({ where: { id } });
            if (!formato) {
                throw new common_1.NotFoundException('Formato no encontrado');
            }
            return formato;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getFormatoById', { id });
            throw error;
        }
    }
    async getFormatoBySlug(slug) {
        try {
            const formato = await this.formatoReadRepo.findOne({ where: { slug, isActive: true } });
            if (!formato) {
                throw new common_1.NotFoundException('Formato no encontrado');
            }
            await this.formatoRepo.increment({ id: formato.id }, 'usageCount', 1);
            return formato;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getFormatoBySlug', { slug });
            throw error;
        }
    }
    async createFormato(createFormatoDto, userId) {
        try {
            const formatoData = {
                ...createFormatoDto,
                createdBy: userId,
                slug: this.generateUniqueSlug(createFormatoDto.name, 'formato'),
            };
            const formato = this.formatoRepo.create(formatoData);
            const savedFormato = await this.formatoRepo.save(formato);
            this.logger.log(`Formato creado exitosamente: ${savedFormato.id}`);
            return savedFormato;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'createFormato', { createFormatoDto, userId });
            throw new common_1.BadRequestException('Error al crear el formato');
        }
    }
    async updateFormato(id, updateFormatoDto, userId) {
        try {
            const formato = await this.getFormatoById(id);
            if (updateFormatoDto.name && updateFormatoDto.name !== formato.name) {
                updateFormatoDto.slug = this.generateUniqueSlug(updateFormatoDto.name, 'formato');
            }
            await this.formatoRepo.update(id, {
                ...updateFormatoDto,
                updatedBy: userId,
                updatedAt: new Date(),
            });
            const updatedFormato = await this.getFormatoById(id);
            this.logger.log(`Formato actualizado: ${id}`);
            return updatedFormato;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'updateFormato', { id, updateFormatoDto, userId });
            throw new common_1.BadRequestException('Error al actualizar el formato');
        }
    }
    async deleteFormato(id) {
        try {
            await this.formatoRepo.update(id, {
                isActive: false,
                updatedAt: new Date(),
            });
            this.logger.log(`Formato eliminado: ${id}`);
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'deleteFormato', { id });
            throw error;
        }
    }
    async getPredefinedTemplates() {
        try {
            return formatos_const_1.FORMATOS_TEMPLATES;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getPredefinedTemplates', {});
            throw new common_1.BadRequestException('Error al obtener los templates predefinidos');
        }
    }
    async importTemplate(templateKey, userId) {
        try {
            const template = formatos_const_1.FORMATOS_TEMPLATES[templateKey];
            if (!template) {
                throw new common_1.NotFoundException('Template no encontrado');
            }
            const existingFormato = await this.formatoReadRepo.findOne({
                where: { slug: template.slug }
            });
            if (existingFormato) {
                throw new common_1.BadRequestException('Ya existe un formato con este slug');
            }
            const formato = this.formatoRepo.create({
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
                createdBy: userId,
                sortOrder: 0,
            });
            const savedFormato = await this.formatoRepo.save(formato);
            this.logger.log(`Template importado como formato: ${templateKey} -> ${savedFormato.id}`);
            return savedFormato;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'importTemplate', { templateKey, userId });
            throw error;
        }
    }
    async getLandingsStats() {
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getLandingsStats', {});
            throw new common_1.BadRequestException('Error al obtener estadísticas');
        }
    }
    async getFormatosStats() {
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getFormatosStats', {});
            throw new common_1.BadRequestException('Error al obtener estadísticas de formatos');
        }
    }
    generateUniqueSlug(title, prefix = 'landing') {
        const baseSlug = this.normalizeText(title).replace(/\s+/g, '-').trim();
        const timestamp = Date.now().toString(36);
        return `${prefix}-${baseSlug}-${timestamp}`;
    }
    buildQuery(filters) {
        const query = {};
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
                { ...query, title: (0, typeorm_2.Like)(`%${filters.search}%`) },
                { ...query, description: (0, typeorm_2.Like)(`%${filters.search}%`) },
                { ...query, content: (0, typeorm_2.Like)(`%${filters.search}%`) },
            ];
        }
        return query;
    }
    buildFormatosQuery(filters) {
        const query = {};
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
                { ...query, name: (0, typeorm_2.Like)(`%${filters.search}%`) },
                { ...query, description: (0, typeorm_2.Like)(`%${filters.search}%`) }
            ];
        }
        return query;
    }
    normalizeText(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }
    async titleExists(title, excludeId) {
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
};
exports.LandingsService = LandingsService;
exports.LandingsService = LandingsService = LandingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(landings_schemas_1.Landing, 'WRITE_CONNECTION')),
    __param(1, (0, typeorm_1.InjectRepository)(landings_schemas_1.Landing, 'READ_CONNECTION')),
    __param(2, (0, typeorm_1.InjectRepository)(formatos_schema_1.Formato, 'WRITE_CONNECTION')),
    __param(3, (0, typeorm_1.InjectRepository)(formatos_schema_1.Formato, 'READ_CONNECTION')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        landings_service_spec_1.LandingValidationService,
        landings_error_service_1.LandingErrorService])
], LandingsService);
//# sourceMappingURL=landings.service.js.map