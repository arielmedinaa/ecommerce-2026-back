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
var CuponesService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CuponesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const cupon_schema_1 = require("../schemas/cupon.schema");
let CuponesService = CuponesService_1 = class CuponesService {
    constructor(cuponRepository, cuponRepositoryRead) {
        this.cuponRepository = cuponRepository;
        this.cuponRepositoryRead = cuponRepositoryRead;
        this.logger = new common_1.Logger(CuponesService_1.name);
    }
    async crearCupon(createCuponDto) {
        try {
            const nuevoCupon = this.cuponRepository.create(createCuponDto);
            const savedCupon = await this.cuponRepository.save(nuevoCupon);
            return {
                data: savedCupon,
                message: 'CUPON CREADO CON EXITO',
                success: true,
            };
        }
        catch (error) {
            this.logger.error('Error al crear cupon', error);
            throw new common_1.BadRequestException('Error al crear el cupón o el código ya existe.');
        }
    }
    async obtenerTodos(page = 1, limit = 10, filters = {}) {
        const skip = Math.max(0, (page - 1) * limit);
        const queryBuilder = this.cuponRepositoryRead.createQueryBuilder('cupon');
        if (filters.codigo) {
            queryBuilder.andWhere('cupon.codigo LIKE :codigo', {
                codigo: `%${filters.codigo}%`,
            });
        }
        if (filters.activo !== undefined) {
            queryBuilder.andWhere('cupon.activo = :activo', {
                activo: filters.activo,
            });
        }
        const [cupones, total] = await queryBuilder
            .skip(skip)
            .take(limit)
            .orderBy('cupon.createdAt', 'DESC')
            .getManyAndCount();
        return {
            cupones,
            total,
            pages: Math.ceil(total / limit),
        };
    }
    async obtenerPorCodigo(codigo) {
        const cupon = await this.cuponRepositoryRead.findOne({ where: { codigo } });
        if (!cupon) {
            throw new common_1.NotFoundException(`Cupón con código ${codigo} no encontrado`);
        }
        return cupon;
    }
    async validarCuponBase(codigo, montoCarrito) {
        const cupon = await this.cuponRepositoryRead.findOne({
            where: { codigo, activo: true },
        });
        if (!cupon)
            return {
                valido: false,
                descuentoAplicable: 0,
                mensaje: 'Cupón no existe o está inactivo',
            };
        const hoy = new Date();
        if (hoy < cupon.fechaInicio || hoy > cupon.fechaFin) {
            return {
                valido: false,
                descuentoAplicable: 0,
                mensaje: 'El cupón no está dentro del periodo válido',
            };
        }
        if (cupon.limiteUsos > 0 && cupon.usosActuales >= cupon.limiteUsos) {
            return {
                valido: false,
                descuentoAplicable: 0,
                mensaje: 'El cupón ha alcanzado su límite de usos',
            };
        }
        if (cupon.montoMinimoCompra > 0 && montoCarrito < cupon.montoMinimoCompra) {
            return {
                valido: false,
                descuentoAplicable: 0,
                mensaje: `El monto mínimo de compra debe ser ${cupon.montoMinimoCompra}`,
            };
        }
        let descuentoAplicable = 0;
        if (cupon.tipoDescuento === 'PORCENTAJE') {
            descuentoAplicable = montoCarrito * (cupon.valorDescuento / 100);
        }
        else {
            descuentoAplicable = cupon.valorDescuento;
            if (descuentoAplicable > montoCarrito) {
                descuentoAplicable = montoCarrito;
            }
        }
        return { valido: true, descuentoAplicable, mensaje: 'Cupón válido' };
    }
    async registrarUsoCupon(codigo) {
        const cupon = await this.cuponRepository.findOne({ where: { codigo } });
        if (!cupon)
            throw new common_1.NotFoundException('Cupón no encontrado');
        cupon.usosActuales += 1;
        return await this.cuponRepository.save(cupon);
    }
    async desactivarCupon(id) {
        const cupon = await this.cuponRepository.findOne({ where: { id } });
        if (!cupon)
            throw new common_1.NotFoundException('Cupón no encontrado');
        cupon.activo = false;
        return await this.cuponRepository.save(cupon);
    }
};
exports.CuponesService = CuponesService;
exports.CuponesService = CuponesService = CuponesService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(cupon_schema_1.Cupon, 'WRITE_CONNECTION')),
    __param(1, (0, typeorm_1.InjectRepository)(cupon_schema_1.Cupon, 'READ_CONNECTION')),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CuponesService);
//# sourceMappingURL=cupones.service.js.map