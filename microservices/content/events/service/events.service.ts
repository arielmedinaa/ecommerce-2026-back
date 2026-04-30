import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, IsNull } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Event } from '../schemas/event.schema';
import { EventProduct } from '../schemas/event-product.schema';
import { ConditionType } from '../schemas/event-condition.schema';
import { Order } from '../schemas/order.schema';
//import { OrderItem } from '../schemas/order-item.schema';
import { CreateEventDto } from '../schemas/dto/create-event.dto';
import { ConditionsService } from '../conditions/service/conditions.service';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    @InjectRepository(Event, 'WRITE_CONNECTION')
    private readonly eventRepository: Repository<Event>,

    @InjectRepository(Event, 'READ_CONNECTION')
    private readonly eventRepositoryRead: Repository<Event>,

    @InjectRepository(EventProduct, 'WRITE_CONNECTION')
    private readonly eventProductRepository: Repository<EventProduct>,

    @InjectRepository(EventProduct, 'READ_CONNECTION')
    private readonly eventProductRepositoryRead: Repository<EventProduct>,

    @InjectRepository(Order, 'READ_CONNECTION')
    private readonly orderRepositoryRead: Repository<Order>,

    // @InjectRepository(OrderItem, 'READ_CONNECTION')
    // private readonly orderItemRepositoryRead: Repository<OrderItem>,

    private readonly conditionsService: ConditionsService,

    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
  ) {}

  async createEvent(
    createEventDto: CreateEventDto,
  ): Promise<{ data: Event; message: string; success: boolean }> {
    try {
      const { productos, ...eventData } = createEventDto;
      if (new Date(eventData.fechaInicio) >= new Date(eventData.fechaFin)) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin.',
        );
      }

      if (eventData.idEventoPadre) {
        const parentEvent = await this.eventRepositoryRead.findOne({
          where: { id: eventData.idEventoPadre },
        });
        if (!parentEvent) {
          throw new BadRequestException('El evento padre no existe.');
        }
        if (
          new Date(eventData.fechaInicio) < new Date(parentEvent.fechaInicio) ||
          new Date(eventData.fechaFin) > new Date(parentEvent.fechaFin)
        ) {
          throw new BadRequestException(
            'Las fechas del evento hijo deben estar dentro del rango del evento padre.',
          );
        }
      }

      const newEvent = this.eventRepository.create(eventData);
      const savedEvent = await this.eventRepository.save(newEvent);

      if (productos && productos.length > 0) {
        const eventProducts = productos.map((prod) =>
          this.eventProductRepository.create({
            evento_id: savedEvent.id,
            producto_codigo: prod.producto_codigo,
            limitePorUsuario: prod.limitePorUsuario,
            precioOferta: prod.precioOferta,
          }),
        );
        await this.eventProductRepository.save(eventProducts);
      }

      const eventWithRelations = await this.eventRepositoryRead.findOne({
        where: { id: savedEvent.id },
        relations: ['eventProducts', 'conditions', 'subEventos'],
      });

      if (!eventWithRelations) {
        throw new BadRequestException('ERROR AL RECUPERAR EL EVENTO CREADO.');
      }

      return {
        data: eventWithRelations,
        message: 'EVENTO CREADO CON EXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al crear evento', error);
      throw new BadRequestException(
        error.message || 'ERROR AL CREAR EL EVENTO.',
      );
    }
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    filters: any = {},
  ): Promise<{ events: Event[]; total: number; pages: number }> {
    const skip = Math.max(0, (page - 1) * limit);
    const queryBuilder = this.eventRepositoryRead.createQueryBuilder('evento');

    if (filters.nombre) {
      queryBuilder.andWhere('evento.nombre LIKE :nombre', {
        nombre: `%${filters.nombre}%`,
      });
    }
    if (filters.activo !== undefined) {
      queryBuilder.andWhere('evento.activo = :activo', {
        activo: filters.activo,
      });
    }
    if (filters.fechaInicio) {
      queryBuilder.andWhere('evento.fechaInicio >= :fechaInicio', {
        fechaInicio: filters.fechaInicio,
      });
    }
    if (filters.fechaFin) {
      queryBuilder.andWhere('evento.fechaFin <= :fechaFin', {
        fechaFin: filters.fechaFin,
      });
    }

    const [events, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('evento.prioridad', 'DESC')
      .addOrderBy('evento.createdAt', 'DESC')
      .getManyAndCount();

    return {
      events,
      total,
      pages: Math.ceil(total / limit),
    };
  }

  async findById(id: number): Promise<Event> {
    const event = await this.eventRepositoryRead.findOne({
      where: { id },
      relations: ['eventProducts', 'conditions', 'subEventos', 'eventoPadre'],
    });
    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }
    return event;
  }

  async findActiveEvents(): Promise<Event[]> {
    const now = new Date();
    const events = await this.eventRepositoryRead.find({
      where: {
        activo: true,
        fechaInicio: LessThanOrEqual(now),
        fechaFin: MoreThanOrEqual(now),
        idEventoPadre: IsNull(), // Solo eventos raíz
      },
      relations: ['eventProducts', 'conditions', 'subEventos'],
      order: { prioridad: 'DESC' },
    });
    return events;
  }

  async findActiveEventForProduct(
    producto_codigo: string,
  ): Promise<Event | null> {
    const now = new Date();
    const event = await this.eventRepositoryRead
      .createQueryBuilder('evento')
      .innerJoinAndSelect(
        'evento.eventProducts',
        'ep',
        'ep.producto_codigo = :producto_codigo',
        { producto_codigo },
      )
      .leftJoinAndSelect(
        'evento.conditions',
        'condition',
        'condition.activo = true',
      )
      .where('evento.activo = true')
      .andWhere('evento.fechaInicio <= :now', { now })
      .andWhere('evento.fechaFin >= :now', { now })
      .orderBy('evento.prioridad', 'DESC')
      .getOne();
    return event || null;
  }

  async addProductToEvent(
    eventId: number,
    producto_codigo: string,
    limitePorUsuario?: number,
    precioOferta?: number,
  ): Promise<{ data: any; message: string; success: boolean }> {
    const existing = await this.eventProductRepositoryRead.findOne({
      where: { evento_id: eventId, producto_codigo },
    });
    if (existing) {
      return {
        data: [],
        message: `El producto ${producto_codigo} ya está asignado al evento ${eventId}`,
        success: false,
      };
    }
    const eventProduct = this.eventProductRepository.create({
      evento_id: eventId,
      producto_codigo,
      limitePorUsuario,
      precioOferta,
    });
    return {
      data: await this.eventProductRepository.save(eventProduct),
      message: 'PRODUCTO AGREGADO AL EVENTO',
      success: true,
    };
  }

  async removeProductFromEvent(
    eventId: number,
    producto_codigo: string,
  ): Promise<void> {
    const result = await this.eventProductRepository.delete({
      evento_id: eventId,
      producto_codigo,
    });
    if (result.affected === 0) {
      throw new NotFoundException(
        `Producto ${producto_codigo} no encontrado en evento ${eventId}`,
      );
    }
  }

  async validateProductAddToCart(
    producto_codigo: string,
    cliente_id: string,
    usuario?: any,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    precioOferta?: number;
    condiciones?: Array<{ tipo: ConditionType; valor: string }>;
    limite?: number | null;
    eventoId?: number;
    eventoNombre?: string;
  }> {
    const now = new Date();
    const activeEvents = await this.eventRepositoryRead
      .createQueryBuilder('evento')
      .innerJoinAndSelect(
        'evento.eventProducts',
        'ep',
        'ep.producto_codigo = :producto_codigo',
        { producto_codigo },
      )

      .where('evento.activo = 1')
      .andWhere('evento.fechaInicio <= :now', { now })
      .andWhere('evento.fechaFin >= :now', { now })
      .orderBy('evento.prioridad', 'DESC')
      .getMany();

    if (activeEvents.length === 0) {
      return { allowed: true };
    }

    const selectedEvent = activeEvents[0];
    const eventProduct = selectedEvent.eventProducts?.find(
      (ep) => ep.producto_codigo === producto_codigo.toString(),
    );

    if (!eventProduct) {
      return { allowed: true };
    }
    console.log("SELECTED EVENT", selectedEvent)

    const esEventoBeneficio = selectedEvent.codigo && selectedEvent.codigo.startsWith('B-');
    if (selectedEvent.beneficioUsuarioEspecifico && usuario) {
      const hasBenefit = await this.checkUserSegmentation(
        usuario,
        selectedEvent.beneficioUsuarioEspecifico,
      );
      if (!hasBenefit) {
        if (esEventoBeneficio) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `Este evento es exclusivo para usuarios con beneficio: ${selectedEvent.beneficioUsuarioEspecifico}.`,
        };
      }
    }

    const conditionsMet = await this.evaluateConditions(
      selectedEvent,
      cliente_id,
      usuario,
    );
    if (!conditionsMet.allowed) {
      if (esEventoBeneficio) {
        return { allowed: true };
      }
      return conditionsMet;
    }

    const limite =
      eventProduct.limitePorUsuario ?? selectedEvent.limiteGlobalPorUsuario;
    return {
      allowed: true,
      precioOferta: eventProduct.precioOferta,
      condiciones: conditionsMet.condiciones,
      limite: limite || null,
      eventoId: selectedEvent.id,
      eventoNombre: selectedEvent.nombre,
    };
  }

  private async evaluateConditions(
    event: Event,
    cliente_id: string,
    usuario?: any,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    condiciones: Array<{ tipo: ConditionType; valor: string }>;
  }> {
    const conditions = await this.conditionsService.findByEvent(event.id);
    const condicionesRequierenValidacion: Array<{
      tipo: ConditionType;
      valor: string;
    }> = [];

    for (const condition of conditions) {
      switch (condition.tipo) {
        case ConditionType.MIN_CARRITO:
        case ConditionType.MAX_UNIDADES_PEDIDO:
        case ConditionType.METODO_PAGO_ESPECIFICO:
          condicionesRequierenValidacion.push({
            tipo: condition.tipo,
            valor: condition.valor,
          });
          break;
        case ConditionType.SOLO_NUEVOS_USUARIOS:
          let esNuevoUsuario = false;
          if (usuario && usuario.etiquetas) {
            esNuevoUsuario = usuario.etiquetas.includes('NUEVO_USUARIO');
          }
          
          if (!esNuevoUsuario) {
            const orderCount = await this.orderRepositoryRead.count({
              where: { cliente_documento: cliente_id, estado: 1 },
            });
            esNuevoUsuario = orderCount === 0;
          }
          
          if (!esNuevoUsuario) {
            return {
              allowed: false,
              reason: 'Este evento es solo para nuevos usuarios.',
              condiciones: [],
            };
          }
          break;
        default:
          this.logger.warn(
            `Tipo de condición no reconocido: ${condition.tipo}`,
          );
      }
    }
    return { allowed: true, condiciones: condicionesRequierenValidacion };
  }

  private async checkUserSegmentation(
    usuario: any,
    requiredBenefit: string,
  ): Promise<boolean> {
    try {
      const authResponse = await firstValueFrom(
        this.authService.send(
          { cmd: 'obtener_etiquetas_usuario' },
          { usuario_id: usuario.id || usuario.sub },
        ),
      );
      const userTags: string[] = authResponse?.etiquetas || [];
      return userTags.includes(requiredBenefit);
    } catch (error) {
      this.logger.error('Error al verificar segmentación de usuario', error);
      return false;
    }
  }

  async findEventHierarchy(): Promise<Event[]> {
    const rootEvents = await this.eventRepositoryRead.find({
      where: { idEventoPadre: IsNull() },
      relations: ['subEventos', 'eventProducts', 'conditions'],
      order: { prioridad: 'DESC' },
    });
    return rootEvents;
  }

  async deleteEvent(id: number): Promise<void> {
    // Cargar el evento con sus relaciones para eliminación en cascada
    const event = await this.eventRepositoryRead.findOne({
      where: { id },
      relations: ['subEventos', 'eventProducts', 'conditions'],
    });
    if (!event) {
      throw new NotFoundException(`Evento con ID ${id} no encontrado`);
    }

    // Si tiene subeventos, eliminarlos primero (aunque CASCADE debería encargarse)
    if (event.subEventos && event.subEventos.length > 0) {
      for (const subEvent of event.subEventos) {
        await this.deleteEvent(subEvent.id);
      }
    }

    // Eliminar relacionesManyToMany (eventProducts y conditions) ya que no tienen CASCADE
    if (event.eventProducts && event.eventProducts.length > 0) {
      await this.eventProductRepository.delete({ evento_id: id });
    }
    if (event.conditions && event.conditions.length > 0) {
      await this.conditionsService.deleteByEvent(id);
    }

    // Finalmente eliminar el evento
    await this.eventRepository.delete(id);
  }

  async getBenefitEvents(params: { minPurchases?: number; active?: boolean }): Promise<{ data: Event[] }> {
    try {
      const now = new Date();
      const query = this.eventRepositoryRead.createQueryBuilder('event')
        .where('event.activo = :active', { active: params.active ?? true })
        .andWhere('event.codigo IS NOT NULL')
        .andWhere('event.codigo LIKE :prefix', { prefix: 'B-%' })
        .andWhere('event.fechaInicio <= :now', { now })
        .andWhere('event.fechaFin >= :now', { now });

      if (params.minPurchases !== undefined) {
        query.andWhere('event.limiteGlobalPorUsuario <= :minPurchases OR event.limiteGlobalPorUsuario IS NULL', {
          minPurchases: params.minPurchases
        });
      }

      const events = await query.orderBy('event.prioridad', 'DESC').getMany();
      return { data: events };
    } catch (error) {
      this.logger.error('Error al obtener eventos de beneficios:', error);
      return { data: [] };
    }
  }
}
