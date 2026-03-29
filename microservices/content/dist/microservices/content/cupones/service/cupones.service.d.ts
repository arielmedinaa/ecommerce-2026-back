import { Repository } from 'typeorm';
import { Cupon } from '../schemas/cupon.schema';
import { CreateCuponDto } from '../schemas/dto/create-cupon.dto';
export declare class CuponesService {
    private readonly cuponRepository;
    private readonly cuponRepositoryRead;
    private readonly logger;
    constructor(cuponRepository: Repository<Cupon>, cuponRepositoryRead: Repository<Cupon>);
    crearCupon(createCuponDto: CreateCuponDto): Promise<{
        data: Cupon;
        message: string;
        success: boolean;
    }>;
    obtenerTodos(page?: number, limit?: number, filters?: any): Promise<{
        cupones: Cupon[];
        total: number;
        pages: number;
    }>;
    obtenerPorCodigo(codigo: string): Promise<Cupon>;
    validarCuponBase(codigo: string, montoCarrito: number): Promise<{
        valido: boolean;
        descuentoAplicable: number;
        mensaje?: string;
    }>;
    registrarUsoCupon(codigo: string): Promise<Cupon>;
    desactivarCupon(id: number): Promise<Cupon>;
}
