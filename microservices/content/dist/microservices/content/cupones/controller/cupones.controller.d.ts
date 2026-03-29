import { CuponesService } from '../service/cupones.service';
export declare class CuponesController {
    private readonly cuponesService;
    constructor(cuponesService: CuponesService);
    crearCupon(payload: any): Promise<{
        data: import("../schemas/cupon.schema").Cupon;
        message: string;
        success: boolean;
    }>;
    listarCupones(payload: any): Promise<{
        cupones: import("../schemas/cupon.schema").Cupon[];
        total: number;
        pages: number;
    }>;
    validarCupon(payload: any): Promise<{
        valido: boolean;
        descuentoAplicable: number;
        mensaje?: string;
    }>;
    registrarUsoCupon(payload: any): Promise<import("../schemas/cupon.schema").Cupon>;
    desactivarCupon(payload: any): Promise<import("../schemas/cupon.schema").Cupon>;
}
