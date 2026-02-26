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
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const landings_schemas_1 = require("../schemas/landings.schemas");
const formatos_schema_1 = require("../schemas/formatos.schema");
const formatos_const_1 = require("../const/formatos.const");
const landings_service_spec_1 = require("./landings.service.spec");
const landings_error_service_1 = require("./errors/landings-error.service");
let LandingsService = LandingsService_1 = class LandingsService {
    constructor(landingModel, formatoModel, landingValidationService, landingErrorService) {
        this.landingModel = landingModel;
        this.formatoModel = formatoModel;
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
            const landing = new this.landingModel({
                ...createLandingDto,
                createdBy: userId,
                slug: this.generateUniqueSlug(createLandingDto.title),
                tituloRelacionado: this.normalizeText(createLandingDto.title),
            });
            const savedLanding = await landing.save();
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getActiveLandings', { page, limit });
            throw new common_1.BadRequestException('Error al obtener las landings activas');
        }
    }
    async getLandingById(id) {
        try {
            const landing = await this.landingModel
                .findById(id)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .exec();
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
            const landing = await this.landingModel
                .findOne({ slug })
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .exec();
            if (!landing) {
                throw new common_1.NotFoundException('Landing no encontrada');
            }
            await this.landingModel.findByIdAndUpdate(landing._id, {
                $inc: { viewCount: 1 },
            });
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
            }
            const updatedLanding = await this.landingModel
                .findByIdAndUpdate(id, {
                ...updateLandingDto,
                updatedBy: new mongoose_2.Types.ObjectId(userId),
                updatedAt: new Date(),
            }, { new: true, runValidators: true })
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .exec();
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
            const landing = await this.getLandingById(id);
            await this.landingModel.findByIdAndUpdate(id, {
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
            const updatedLanding = await this.landingModel
                .findByIdAndUpdate(id, {
                isPublished: !landing.isPublished,
                publishedAt: !landing.isPublished ? new Date() : undefined,
                updatedBy: new mongoose_2.Types.ObjectId(userId),
                updatedAt: new Date(),
            }, { new: true })
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .exec();
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getAllFormatos', { page, limit, filters });
            throw new common_1.BadRequestException('Error al obtener los formatos');
        }
    }
    async getActiveFormatos() {
        try {
            return await this.formatoModel
                .find({ isActive: true })
                .sort({ sortOrder: 1, usageCount: -1 })
                .exec();
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getActiveFormatos', {});
            throw new common_1.BadRequestException('Error al obtener los formatos activos');
        }
    }
    async getFormatoById(id) {
        try {
            const formato = await this.formatoModel
                .findById(id)
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .exec();
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
            const formato = await this.formatoModel
                .findOne({ slug, isActive: true })
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .exec();
            if (!formato) {
                throw new common_1.NotFoundException('Formato no encontrado');
            }
            await this.formatoModel.findByIdAndUpdate(formato._id, {
                $inc: { usageCount: 1 },
            });
            return formato;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getFormatoBySlug', { slug });
            throw error;
        }
    }
    async createFormato(createFormatoDto, userId) {
        try {
            const formato = new this.formatoModel({
                ...createFormatoDto,
                createdBy: new mongoose_2.Types.ObjectId(userId),
                slug: this.generateUniqueSlug(createFormatoDto.name, 'formato'),
            });
            const savedFormato = await formato.save();
            this.logger.log(`Formato creado exitosamente: ${savedFormato._id}`);
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
            const updatedFormato = await this.formatoModel
                .findByIdAndUpdate(id, {
                ...updateFormatoDto,
                updatedBy: new mongoose_2.Types.ObjectId(userId),
                updatedAt: new Date(),
            }, { new: true, runValidators: true })
                .populate('createdBy', 'name email')
                .populate('updatedBy', 'name email')
                .exec();
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
            const formato = await this.getFormatoById(id);
            await this.formatoModel.findByIdAndUpdate(id, {
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
            const existingFormato = await this.formatoModel.findOne({
                slug: template.slug,
            });
            if (existingFormato) {
                throw new common_1.BadRequestException('Ya existe un formato con este slug');
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
                createdBy: new mongoose_2.Types.ObjectId(userId),
                sortOrder: 0,
            });
            const savedFormato = await formato.save();
            this.logger.log(`Template importado como formato: ${templateKey} -> ${savedFormato._id}`);
            return savedFormato;
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'importTemplate', { templateKey, userId });
            throw error;
        }
    }
    async getLandingsStats() {
        try {
            const [totalLandings, activeLandings, publishedLandings, totalViews] = await Promise.all([
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
        }
        catch (error) {
            await this.landingErrorService.logMicroserviceError(error, '', 'getLandingsStats', {});
            throw new common_1.BadRequestException('Error al obtener estadísticas');
        }
    }
    async getFormatosStats() {
        try {
            const [totalFormatos, activeFormatos, premiumFormatos, totalUsages] = await Promise.all([
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
            query.createdBy = new mongoose_2.Types.ObjectId(filters.createdBy);
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
            .join('.*');
        const query = {
            tituloRelacionado: {
                $regex: new RegExp(`^${regexPattern}$`, 'i'),
            },
        };
        if (excludeId) {
            query._id = { $ne: new mongoose_2.Types.ObjectId(excludeId) };
        }
        const existing = await this.landingModel.findOne(query).lean().exec();
        return !!existing;
    }
};
exports.LandingsService = LandingsService;
exports.LandingsService = LandingsService = LandingsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(landings_schemas_1.Landing.name)),
    __param(1, (0, mongoose_1.InjectModel)(formatos_schema_1.Formato.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        landings_service_spec_1.LandingValidationService,
        landings_error_service_1.LandingErrorService])
], LandingsService);
//# sourceMappingURL=landings.service.js.map