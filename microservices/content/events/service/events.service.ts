import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  LessThanOrEqual,
  MoreThanOrEqual,
  IsNull,
} from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Event } from '../schemas/event.schema';
import { EventProduct } from '../schemas/event-product.schema';
import {
  ConditionType,
} from '../schemas/event-condition.schema';
import { Order } from '../schemas/order.schema';
import { OrderItem } from '../schemas/order-item.schema';
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

    @InjectRepository(OrderItem, 'READ_CONNECTION')
    private readonly orderItemRepositoryRead: Repository<OrderItem>,

    private readonly conditionsService: ConditionsService,

    @Inject('AUTH_SERVICE') private readonly authService: ClientProxy,
  ) {}

  async createEvent(
    createEventDto: CreateEventDto,
  ): Promise<{ data: Event; message: string; success: boolean }> {
    try {
      const { productos, ...eventData } = createEventDto;

      // Validar fechas
      if (new Date(eventData.fechaInicio) >= new Date(eventData.fechaFin)) {
        throw new BadRequestException(
          'La fecha de inicio debe ser anterior a la fecha de fin.',
        );
      }

      // Validar jerarquía si tiene evento padre
      if (eventData.idEventoPadre) {
        const parentEvent = await this.eventRepositoryRead.findOne({
          where: { id: eventData.idEventoPadre },
        });
        if (!parentEvent) {
          throw new BadRequestException('El evento padre no existe.');
        }
        // Validar que las fechas del hijo estén dentro del padre
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

      // Recargar el evento con sus productos, condiciones y subeventos
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
  ): Promise<EventProduct> {
    const event = await this.findById(eventId);
    const existing = await this.eventProductRepositoryRead.findOne({
      where: { evento_id: eventId, producto_codigo },
    });
    if (existing) {
      throw new BadRequestException(
        `El producto ${producto_codigo} ya está asignado al evento ${eventId}`,
      );
    }
    const eventProduct = this.eventProductRepository.create({
      evento_id: eventId,
      producto_codigo,
      limitePorUsuario,
      precioOferta,
    });
    return await this.eventProductRepository.save(eventProduct);
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
    usuario?: any, // Información del usuario desde el token
  ): Promise<{ allowed: boolean; reason?: string; precioOferta?: number }> {
    // 1. Encontrar todos los eventos activos donde el producto esté presente
    const now = new Date();
    const activeEvents = await this.eventRepositoryRead
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
      .getMany();

    if (activeEvents.length === 0) {
      return { allowed: true };
    }

    // 2. Resolver jerarquía y conflictos (el evento de mayor prioridad ya está primero)
    const selectedEvent = activeEvents[0];
    const eventProduct = selectedEvent.eventProducts?.find(
      (ep) => ep.producto_codigo === producto_codigo,
    );
    if (!eventProduct) {
      return { allowed: true };
    }

    // 3. Verificar segmentación de usuario
    if (selectedEvent.beneficioUsuarioEspecifico && usuario) {
      const hasBenefit = await this.checkUserSegmentation(
        usuario,
        selectedEvent.beneficioUsuarioEspecifico,
      );
      if (!hasBenefit) {
        return {
          allowed: false,
          reason: `Este evento es exclusivo para usuarios con beneficio: ${selectedEvent.beneficioUsuarioEspecifico}.`,
        };
      }
    }

    // 4. Evaluar condiciones dinámicas
    const conditionsMet = await this.evaluateConditions(
      selectedEvent,
      cliente_id,
      usuario,
    );
    if (!conditionsMet.allowed) {
      return conditionsMet;
    }

    // 5. Verificar límites (independientes por evento)
    const limite =
      eventProduct.limitePorUsuario ?? selectedEvent.limiteGlobalPorUsuario;
    if (limite) {
      // Contar órdenes pagadas (estado = 1) para este producto en este evento
      const orderCount = await this.orderItemRepositoryRead
        .createQueryBuilder('orderItem')
        .innerJoin('orderItem.orden', 'order', 'order.estado = 1')
        .where('orderItem.producto_codigo = :producto_codigo', {
          producto_codigo,
        })
        .andWhere('order.evento_id = :eventoId', { eventoId: selectedEvent.id })
        .andWhere('order.cliente_documento = :clienteId', {
          clienteId: cliente_id,
        })
        .getCount();

      if (orderCount >= limite) {
        return {
          allowed: false,
          reason: `Límite de compras alcanzado para este producto en el evento ${selectedEvent.nombre}.`,
        };
      }
    }

    // 6. Devolver precioOferta si aplica
    return {
      allowed: true,
      precioOferta: eventProduct.precioOferta,
    };
  }

  private async evaluateConditions(
    event: Event,
    cliente_id: string,
    usuario?: any,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const conditions = await this.conditionsService.findByEvent(event.id);

    for (const condition of conditions) {
      switch (condition.tipo) {
        case ConditionType.MIN_CARRITO:
          // Condición: monto mínimo en carrito (se valida en cart service)
          // Aquí solo pasamos la condición, la validación real es en cart
          break;
        case ConditionType.MAX_UNIDADES_PEDIDO:
          // Condición: máximo unidades por pedido (se valida en cart)
          break;
        case ConditionType.SOLO_NUEVOS_USUARIOS:
          // Verificar si el usuario es nuevo (sin órdenes previas)
          const orderCount = await this.orderRepositoryRead.count({
            where: { cliente_documento: cliente_id, estado: 1 },
          });
          if (orderCount > 0) {
            return {
              allowed: false,
              reason: 'Este evento es solo para nuevos usuarios.',
            };
          }
          break;
        case ConditionType.METODO_PAGO_ESPECIFICO:
          // Condición: método de pago específico (se valida en cart)
          break;
        default:
          this.logger.warn(
            `Tipo de condición no reconocido: ${condition.tipo}`,
          );
      }
    }
    return { allowed: true };
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
}
