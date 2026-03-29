import { Repository } from 'typeorm';
import { Landing } from '@content/landings/schemas/landings.schemas';
import { Formato } from '@content/landings/schemas/formatos.schema';
import { LandingValidationService } from './landings.service.spec';
import { LandingErrorService } from './errors/landings-error.service';
export declare class LandingsService {
    private landingRepo;
    private landingReadRepo;
    private formatoRepo;
    private formatoReadRepo;
    private readonly landingValidationService;
    private readonly landingErrorService;
    private readonly logger;
    constructor(landingRepo: Repository<Landing>, landingReadRepo: Repository<Landing>, formatoRepo: Repository<Formato>, formatoReadRepo: Repository<Formato>, landingValidationService: LandingValidationService, landingErrorService: LandingErrorService);
    crearLanding(createLandingDto: any, userId: string): Promise<{
        data: {};
        message?: any;
    }>;
    getAllLandings(page?: number, limit?: number, filters?: any): Promise<{
        landings: Landing[];
        total: number;
        pages: number;
        currentPage: number;
    }>;
    getActiveLandings(page?: number, limit?: number): Promise<{
        landings: Landing[];
        total: number;
        pages: number;
        currentPage: number;
    }>;
    getLandingById(id: number): Promise<Landing>;
    getLandingBySlug(slug: string): Promise<Landing>;
    updateLanding(id: number, updateLandingDto: any, userId: string): Promise<Landing>;
    deleteLanding(id: string): Promise<void>;
    togglePublishLanding(id: number, userId: string): Promise<Landing>;
    getAllFormatos(page?: number, limit?: number, filters?: any): Promise<{
        formatos: Formato[];
        total: number;
        pages: number;
        currentPage: number;
    }>;
    getActiveFormatos(): Promise<Formato[]>;
    getFormatoById(id: string): Promise<Formato>;
    getFormatoBySlug(slug: string): Promise<Formato>;
    createFormato(createFormatoDto: any, userId: string): Promise<Formato>;
    updateFormato(id: string, updateFormatoDto: any, userId: string): Promise<Formato>;
    deleteFormato(id: string): Promise<void>;
    getPredefinedTemplates(): Promise<any>;
    importTemplate(templateKey: string, userId: string): Promise<Formato>;
    getLandingsStats(): Promise<any>;
    getFormatosStats(): Promise<any>;
    private generateUniqueSlug;
    private buildQuery;
    private buildFormatosQuery;
    private normalizeText;
    private titleExists;
}
