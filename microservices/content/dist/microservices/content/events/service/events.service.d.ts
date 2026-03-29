import { Repository } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Event } from '../schemas/event.schema';
import { EventProduct } from '../schemas/event-product.schema';
import { Order } from '../schemas/order.schema';
import { OrderItem } from '../schemas/order-item.schema';
import { CreateEventDto } from '../schemas/dto/create-event.dto';
import { ConditionsService } from '../conditions/service/conditions.service';
export declare class EventsService {
    private readonly eventRepository;
    private readonly eventRepositoryRead;
    private readonly eventProductRepository;
    private readonly eventProductRepositoryRead;
    private readonly orderRepositoryRead;
    private readonly orderItemRepositoryRead;
    private readonly conditionsService;
    private readonly authService;
    private readonly logger;
    constructor(eventRepository: Repository<Event>, eventRepositoryRead: Repository<Event>, eventProductRepository: Repository<EventProduct>, eventProductRepositoryRead: Repository<EventProduct>, orderRepositoryRead: Repository<Order>, orderItemRepositoryRead: Repository<OrderItem>, conditionsService: ConditionsService, authService: ClientProxy);
    createEvent(createEventDto: CreateEventDto): Promise<{
        data: Event;
        message: string;
        success: boolean;
    }>;
    findAll(page?: number, limit?: number, filters?: any): Promise<{
        events: Event[];
        total: number;
        pages: number;
    }>;
    findById(id: number): Promise<Event>;
    findActiveEvents(): Promise<Event[]>;
    findActiveEventForProduct(producto_codigo: string): Promise<Event | null>;
    addProductToEvent(eventId: number, producto_codigo: string, limitePorUsuario?: number, precioOferta?: number): Promise<EventProduct>;
    removeProductFromEvent(eventId: number, producto_codigo: string): Promise<void>;
    validateProductAddToCart(producto_codigo: string, cliente_id: string, usuario?: any): Promise<{
        allowed: boolean;
        reason?: string;
        precioOferta?: number;
    }>;
    private evaluateConditions;
    private checkUserSegmentation;
    findEventHierarchy(): Promise<Event[]>;
}
