import { Cart } from '@cart/schemas/cart.schemas';
import { Transaccion } from '@cart/schemas/transaccion.schemas';
import { Order } from '@cart/schemas/order.schemas';
import { OrderItem } from '@cart/schemas/order-item.schemas';
import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { ResilientService } from '@shared/common/decorators/resilient-client.decorator';
import { CachePersistenteService } from '@shared/common/services/cache-persistente.service';
import { CartValidationService } from './cart.service.spec';
import { CartErrorService } from './errors/cart-error.service';
export declare class CartContadoService {
    private readonly carritoWrite;
    private readonly carritoRead;
    private readonly transaccionesRead;
    private readonly orderWrite;
    private readonly orderItemWrite;
    private readonly productsService;
    private readonly paymentsService;
    private readonly contentService;
    private readonly cartValidationService;
    private readonly cartErrorService;
    private readonly resilientService;
    private readonly cacheService;
    private readonly logger;
    private cartCache;
    private readonly cacheTTL;
    constructor(carritoWrite: Repository<Cart>, carritoRead: Repository<Cart>, transaccionesRead: Repository<Transaccion>, orderWrite: Repository<Order>, orderItemWrite: Repository<OrderItem>, productsService: ClientProxy, paymentsService: ClientProxy, contentService: ClientProxy, cartValidationService: CartValidationService, cartErrorService: CartErrorService, resilientService: ResilientService, cacheService: CachePersistenteService);
    addCart(clienteToken: string, cuenta: string, codigo?: number, producto?: any): Promise<{
        data: Cart[];
        success: boolean;
        message: string;
    }>;
    getCart(clienteToken: string, cuenta?: string, codigo?: number): Promise<{
        data: Record<string, any>;
        success: boolean;
        message: string;
    }>;
    getCartByCode(codigo: number): Promise<Cart>;
    getAllCart(clienteToken: string, limit: number, skip: number, sort: string, order?: string, estado?: number): Promise<{
        data: Cart[];
        success: boolean;
        message: string;
    }>;
    getMissingCart(limit: number, skip: number, sort: string, order?: 'asc' | 'desc'): Promise<{
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
    private eliminarDuplicados;
}
