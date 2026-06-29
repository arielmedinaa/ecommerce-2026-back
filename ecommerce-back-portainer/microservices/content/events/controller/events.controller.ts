import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { EventsService } from '../service/events.service';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @MessagePattern({ cmd: 'crearEvento' })
  async createEvent(@Payload() payload: any) {
    const createEventDto = payload?.createEventDto || payload;
    return await this.eventsService.createEvent(createEventDto);
  }

  @MessagePattern({ cmd: 'listarEventos' })
  async listEvents(@Payload() payload: any) {
    const { page, limit, filters } = payload;
    return await this.eventsService.findAll(page, limit, filters);
  }

  @MessagePattern({ cmd: 'obtenerEvento' })
  async getEvent(@Payload() payload: any) {
    const { id } = payload;
    return await this.eventsService.findById(id);
  }

  @MessagePattern({ cmd: 'eventosActivos' })
  async getActiveEvents() {
    return await this.eventsService.findActiveEvents();
  }

  @MessagePattern({ cmd: 'getBenefitEvents' })
  async getBenefitEvents(@Payload() payload: any) {
    const { minPurchases, active } = payload;
    return await this.eventsService.getBenefitEvents({ minPurchases, active });
  }

  @MessagePattern({ cmd: 'agregarProductoAEvento' })
  async addProductToEvent(@Payload() payload: any) {
    const { eventId, producto_codigo, limitePorUsuario } = payload;
    return await this.eventsService.addProductToEvent(
      eventId,
      producto_codigo,
      limitePorUsuario,
    );
  }

  @MessagePattern({ cmd: 'removerProductoDeEvento' })
  async removeProductFromEvent(@Payload() payload: any) {
    const { eventId, producto_codigo } = payload;
    return await this.eventsService.removeProductFromEvent(
      eventId,
      producto_codigo,
    );
  }

  @MessagePattern({ cmd: 'validarProductoParaCarrito' })
  async validateProductForCart(@Payload() payload: any) {
    const { producto_codigo, cliente_id, usuario } = payload;
    return await this.eventsService.validateProductAddToCart(
      producto_codigo,
      cliente_id,
      usuario,
    );
  }

  @MessagePattern({ cmd: 'obtenerEventoActivoParaProducto' })
  async getActiveEventForProduct(@Payload() payload: any) {
    const { producto_codigo } = payload;
    return await this.eventsService.findActiveEventForProduct(producto_codigo);
  }

  @MessagePattern({ cmd: 'obtenerJerarquiaEventos' })
  async getEventHierarchy() {
    return await this.eventsService.findEventHierarchy();
  }

  @MessagePattern({ cmd: 'eliminarEvento' })
  async deleteEvent(@Payload() payload: any) {
    const { id } = payload;
    await this.eventsService.deleteEvent(id);
    return { message: 'Evento eliminado exitosamente' };
  }
}
