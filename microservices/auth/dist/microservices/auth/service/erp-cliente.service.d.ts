import { EcontDatabaseService } from '@shared/config/database/econt.database.module';
export interface ErpReferencia {
    nombre: string;
    parentesco: string;
    celular: string;
}
export interface ErpClienteDto {
    encontrado: boolean;
    codigo?: number;
    documento?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    callePrincipal?: string;
    calleSecundaria?: string;
    numerocasa?: string;
    ciudadId?: string;
    barrio?: string;
    laboral?: {
        empresa?: string;
        cargo?: string;
        rubro?: string;
        fechaIngreso?: string;
        salario?: number;
        ciudad?: string;
        barrio?: string;
        callePrincipal?: string;
        calleSecundaria?: string;
        numerocasa?: string;
        contactoNombre?: string;
        contactoTelefono?: string;
    };
    referencias?: ErpReferencia[];
}
export interface ErpCatalogos {
    cargos: {
        codigo: number;
        nombre: string;
    }[];
    rubros: {
        id: number;
        descripcion: string;
    }[];
}
export declare class ErpClienteService {
    private readonly econt;
    private readonly logger;
    constructor(econt: EcontDatabaseService);
    getClienteErpByDocumento(documento: string): Promise<ErpClienteDto>;
    private getReferencias;
    getCatalogos(): Promise<ErpCatalogos>;
    private toDateStr;
    private parseRuc;
    private splitNombre;
    private str;
}
