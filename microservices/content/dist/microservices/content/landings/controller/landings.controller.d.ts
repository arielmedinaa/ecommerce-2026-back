import { Landing } from '@landings/schemas/landings.schemas';
import { LandingsService } from '@landings/service/landings.service';
import { Formato } from '@landings/schemas/formatos.schema';
export declare class LandingsController {
    private readonly landingsService;
    constructor(landingsService: LandingsService);
    crearLanding(payload: any): Promise<{
        data: {};
        message?: any;
    }>;
    getAllLandings(payload: any): Promise<{
        landings: Landing[];
        total: number;
        pages: number;
    }>;
    getActiveLandings(payload: any): Promise<{
        landings: Landing[];
        total: number;
        pages: number;
        currentPage: number;
    }>;
    getLandingById(payload: any): Promise<Landing>;
    updateLanding(payload: any): Promise<Landing>;
    deleteLanding(payload: any): Promise<void>;
    getAllFormatos(payload: any): Promise<{
        formatos: Formato[];
        total: number;
        pages: number;
    }>;
    getFormatoById(payload: any): Promise<Formato>;
    getPredefinedTemplates(): Promise<any>;
}
