import { EventsService } from '../service/events.service';
export declare class EventsController {
    private readonly eventsService;
    constructor(eventsService: EventsService);
    createEvent(payload: any): Promise<{
        data: import("../schemas/event.schema").Event;
        message: string;
        success: boolean;
    }>;
    listEvents(payload: any): Promise<{
        events: import("../schemas/event.schema").Event[];
        total: number;
        pages: number;
    }>;
    getEvent(payload: any): Promise<import("../schemas/event.schema").Event>;
    getActiveEvents(): Promise<import("../schemas/event.schema").Event[]>;
    addProductToEvent(payload: any): Promise<import("../schemas/event-product.schema").EventProduct>;
    removeProductFromEvent(payload: any): Promise<void>;
    validateProductForCart(payload: any): Promise<{
        allowed: boolean;
        reason?: string;
        precioOferta?: number;
    }>;
    getActiveEventForProduct(payload: any): Promise<import("../schemas/event.schema").Event>;
    getEventHierarchy(): Promise<import("../schemas/event.schema").Event[]>;
}
