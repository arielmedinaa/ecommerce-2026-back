"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const microservices_1 = require("@nestjs/microservices");
const rxjs_1 = require("rxjs");
const event_schema_1 = require("../schemas/event.schema");
const event_product_schema_1 = require("../schemas/event-product.schema");
const event_condition_schema_1 = require("../schemas/event-condition.schema");
const order_schema_1 = require("../schemas/order.schema");
const order_item_schema_1 = require("../schemas/order-item.schema");
const conditions_service_1 = require("../conditions/service/conditions.service");
let EventsService = EventsService_1 = class EventsService {
    constructor(eventRepository, eventRepositoryRead, eventProductRepository, eventProductRepositoryRead, orderRepositoryRead, orderItemRepositoryRead, conditionsService, authService) {
        this.eventRepository = eventRepository;
        this.eventRepositoryRead = eventRepositoryRead;
        this.eventProductRepository = eventProductRepository;
        this.eventProductRepositoryRead = eventProductRepositoryRead;
        this.orderRepositoryRead = orderRepositoryRead;
        this.orderItemRepositoryRead = orderItemRepositoryRead;
        this.conditionsService = conditionsService;
        this.authService = authService;
        this.logger = new common_1.Logger(EventsService_1.name);
    }
    async createEvent(createEventDto) {
        try {
            const { productos, ...eventData } = createEventDto;
            if (new Date(eventData.fechaInicio) >= new Date(eventData.fechaFin)) {
                throw new common_1.BadRequestException('La fecha de inicio debe ser anterior a la fecha de fin.');
            }
            if (eventData.idEventoPadre) {
                const parentEvent = await this.eventRepositoryRead.findOne({
                    where: { id: eventData.idEventoPadre },
                });
                if (!parentEvent) {
                    throw new common_1.BadRequestException('El evento padre no existe.');
                }
                if (new Date(eventData.fechaInicio) < new Date(parentEvent.fechaInicio) ||
                    new Date(eventData.fechaFin) > new Date(parentEvent.fechaFin)) {
                    throw new common_1.BadRequestException('Las fechas del evento hijo deben estar dentro del rango del evento padre.');
                }
            }
            const newEvent = this.eventRepository.create(eventData);
            const savedEvent = await this.eventRepository.save(newEvent);
            if (productos && productos.length > 0) {
                const eventProducts = productos.map((prod) => this.eventProductRepository.create({
                    evento_id: savedEvent.id,
                    producto_codigo: prod.producto_codigo,
                    limitePorUsuario: prod.limitePorUsuario,
                    precioOferta: prod.precioOferta,
                }));
                await this.eventProductRepository.save(eventProducts);
            }
            const eventWithRelations = await this.eventRepositoryRead.findOne({
                where: { id: savedEvent.id },
                relations: ['eventProducts', 'conditions', 'subEventos'],
            });
            if (!eventWithRelations) {
                throw new common_1.BadRequestException('ERROR AL RECUPERAR EL EVENTO CREADO.');
            }
            return {
                data: eventWithRelations,
                message: 'EVENTO CREADO CON EXITO',
                success: true,
            };
        }
        catch (error) {
            this.logger.error('Error al crear evento', error);
            throw new common_1.BadRequestException(error.message || 'ERROR AL CREAR EL EVENTO.');
        }
    }
    async findAll(page = 1, limit = 10, filters = {}) {
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
    async findById(id) {
        const event = await this.eventRepositoryRead.findOne({
            where: { id },
            relations: ['eventProducts', 'conditions', 'subEventos', 'eventoPadre'],
        });
        if (!event) {
            throw new common_1.NotFoundException(`Evento con ID ${id} no encontrado`);
        }
        return event;
    }
    async findActiveEvents() {
        const now = new Date();
        const events = await this.eventRepositoryRead.find({
            where: {
                activo: true,
                fechaInicio: (0, typeorm_2.LessThanOrEqual)(now),
                fechaFin: (0, typeorm_2.MoreThanOrEqual)(now),
                idEventoPadre: (0, typeorm_2.IsNull)(),
            },
            relations: ['eventProducts', 'conditions', 'subEventos'],
            order: { prioridad: 'DESC' },
        });
        return events;
    }
    async findActiveEventForProduct(producto_codigo) {
        const now = new Date();
        const event = await this.eventRepositoryRead
            .createQueryBuilder('evento')
            .innerJoinAndSelect('evento.eventProducts', 'ep', 'ep.producto_codigo = :producto_codigo', { producto_codigo })
            .leftJoinAndSelect('evento.conditions', 'condition', 'condition.activo = true')
            .where('evento.activo = true')
            .andWhere('evento.fechaInicio <= :now', { now })
            .andWhere('evento.fechaFin >= :now', { now })
            .orderBy('evento.prioridad', 'DESC')
            .getOne();
        return event || null;
    }
    async addProductToEvent(eventId, producto_codigo, limitePorUsuario, precioOferta) {
        const event = await this.findById(eventId);
        const existing = await this.eventProductRepositoryRead.findOne({
            where: { evento_id: eventId, producto_codigo },
        });
        if (existing) {
            throw new common_1.BadRequestException(`El producto ${producto_codigo} ya está asignado al evento ${eventId}`);
        }
        const eventProduct = this.eventProductRepository.create({
            evento_id: eventId,
            producto_codigo,
            limitePorUsuario,
            precioOferta,
        });
        return await this.eventProductRepository.save(eventProduct);
    }
    async removeProductFromEvent(eventId, producto_codigo) {
        const result = await this.eventProductRepository.delete({
            evento_id: eventId,
            producto_codigo,
        });
        if (result.affected === 0) {
            throw new common_1.NotFoundException(`Producto ${producto_codigo} no encontrado en evento ${eventId}`);
        }
    }
    async validateProductAddToCart(producto_codigo, cliente_id, usuario) {
        const now = new Date();
        const activeEvents = await this.eventRepositoryRead
            .createQueryBuilder('evento')
            .innerJoinAndSelect('evento.eventProducts', 'ep', 'ep.producto_codigo = :producto_codigo', { producto_codigo })
            .leftJoinAndSelect('evento.conditions', 'condition', 'condition.activo = true')
            .where('evento.activo = true')
            .andWhere('evento.fechaInicio <= :now', { now })
            .andWhere('evento.fechaFin >= :now', { now })
            .orderBy('evento.prioridad', 'DESC')
            .getMany();
        if (activeEvents.length === 0) {
            return { allowed: true };
        }
        const selectedEvent = activeEvents[0];
        const eventProduct = selectedEvent.eventProducts?.find((ep) => ep.producto_codigo === producto_codigo);
        if (!eventProduct) {
            return { allowed: true };
        }
        if (selectedEvent.beneficioUsuarioEspecifico && usuario) {
            const hasBenefit = await this.checkUserSegmentation(usuario, selectedEvent.beneficioUsuarioEspecifico);
            if (!hasBenefit) {
                return {
                    allowed: false,
                    reason: `Este evento es exclusivo para usuarios con beneficio: ${selectedEvent.beneficioUsuarioEspecifico}.`,
                };
            }
        }
        const conditionsMet = await this.evaluateConditions(selectedEvent, cliente_id, usuario);
        if (!conditionsMet.allowed) {
            return conditionsMet;
        }
        const limite = eventProduct.limitePorUsuario ?? selectedEvent.limiteGlobalPorUsuario;
        if (limite) {
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
        return {
            allowed: true,
            precioOferta: eventProduct.precioOferta,
        };
    }
    async evaluateConditions(event, cliente_id, usuario) {
        const conditions = await this.conditionsService.findByEvent(event.id);
        for (const condition of conditions) {
            switch (condition.tipo) {
                case event_condition_schema_1.ConditionType.MIN_CARRITO:
                    break;
                case event_condition_schema_1.ConditionType.MAX_UNIDADES_PEDIDO:
                    break;
                case event_condition_schema_1.ConditionType.SOLO_NUEVOS_USUARIOS:
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
                case event_condition_schema_1.ConditionType.METODO_PAGO_ESPECIFICO:
                    break;
                default:
                    this.logger.warn(`Tipo de condición no reconocido: ${condition.tipo}`);
            }
        }
        return { allowed: true };
    }
    async checkUserSegmentation(usuario, requiredBenefit) {
        try {
            const authResponse = await (0, rxjs_1.firstValueFrom)(this.authService.send({ cmd: 'obtener_etiquetas_usuario' }, { usuario_id: usuario.id || usuario.sub }));
            const userTags = authResponse?.etiquetas || [];
            return userTags.includes(requiredBenefit);
        }
        catch (error) {
            this.logger.error('Error al verificar segmentación de usuario', error);
            return false;
        }
    }
    async findEventHierarchy() {
        const rootEvents = await this.eventRepositoryRead.find({
            where: { idEventoPadre: (0, typeorm_2.IsNull)() },
            relations: ['subEventos', 'eventProducts', 'conditions'],
            order: { prioridad: 'DESC' },
        });
        return rootEvents;
    }
};
exports.EventsService = EventsService;
exports.EventsService = EventsService = EventsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(event_schema_1.Event, 'WRITE_CONNECTION')),
    __param(1, (0, typeorm_1.InjectRepository)(event_schema_1.Event, 'READ_CONNECTION')),
    __param(2, (0, typeorm_1.InjectRepository)(event_product_schema_1.EventProduct, 'WRITE_CONNECTION')),
    __param(3, (0, typeorm_1.InjectRepository)(event_product_schema_1.EventProduct, 'READ_CONNECTION')),
    __param(4, (0, typeorm_1.InjectRepository)(order_schema_1.Order, 'READ_CONNECTION')),
    __param(5, (0, typeorm_1.InjectRepository)(order_item_schema_1.OrderItem, 'READ_CONNECTION')),
    __param(7, (0, common_1.Inject)('AUTH_SERVICE')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        conditions_service_1.ConditionsService,
        microservices_1.ClientProxy])
], EventsService);
//# sourceMappingURL=events.service.js.map