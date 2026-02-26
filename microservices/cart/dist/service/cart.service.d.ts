import { Cart } from '../schemas/cart.schema';
import { Transaccion } from '../schemas/transaccion.schema';
import { Model } from 'mongoose';
import { ObtenerClaveService } from '@shared/common/utils/obtenerClave';
import { ClientProxy } from '@nestjs/microservices';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { CartValidationService } from './cart.service.spec';
import { CartErrorService } from './errors/cart-error.service';
export declare class CartContadoService {
    private readonly carrito;
    private readonly transacciones;
    private readonly productsService;
    private readonly paymentsService;
    private readonly obtenerClaveService;
    private readonly cartValidationService;
    private readonly cartErrorService;
    private readonly resilientService;
    private readonly cacheService;
    private readonly logger;
    private cartCache;
    private readonly cacheTTL;
    constructor(carrito: Model<Cart>, transacciones: Model<Transaccion>, productsService: ClientProxy, paymentsService: ClientProxy, obtenerClaveService: ObtenerClaveService, cartValidationService: CartValidationService, cartErrorService: CartErrorService, resilientService: ResilientService, cacheService: CachePersistenteService);
    addCart(clienteToken: string, cuenta: string, codigo?: number, producto?: any): Promise<{
        data: Cart[];
        success: boolean;
        message: string;
    }>;
    getCart(clienteToken: string, cuenta?: string, codigo?: 0): Promise<{
        data: Record<string, any>;
        success: boolean;
        message: string;
    }>;
    getAllCart(clienteToken: string, limit: number, skip: number, sort: string, order?: string): Promise<{
        data: Cart[];
        success: boolean;
        message: string;
    }>;
    finishCart(clienteToken: string, cuenta?: string, codigo?: number, process?: any): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    private insertarCarritos;
    insertarSolicitudesCentralApp(solicitud: Object, clienteToken: string, cuenta?: string, codigo?: number, clienteInfo?: Object): Promise<{
        data: any[];
        success: boolean;
        message: string;
    }>;
    private getEstadoSolicitudEcont;
    private consultarEstadoEcontDB;
}
