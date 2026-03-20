import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cupon } from '../schemas/cupon.schema';
import { CreateCuponDto } from '../dto/create-cupon.dto';

@Injectable()
export class CuponesService {
  private readonly logger = new Logger(CuponesService.name);

  constructor(
    @InjectRepository(Cupon, 'WRITE_CONNECTION')
    private readonly cuponRepository: Repository<Cupon>,
    
    @InjectRepository(Cupon, 'READ_CONNECTION')
    private readonly cuponRepositoryRead: Repository<Cupon>,
  ) {}

  async crearCupon(createCuponDto: CreateCuponDto): Promise<Cupon> {
    try {
      const nuevoCupon = this.cuponRepository.create(createCuponDto);
      return await this.cuponRepository.save(nuevoCupon);
    } catch (error) {
      this.logger.error('Error al crear cupon', error);
      throw new BadRequestException('Error al crear el cupón o el código ya existe.');
    }
  }

  async obtenerTodos(page: number = 1, limit: number = 10, filters: any = {}): Promise<{ cupones: Cupon[], total: number, pages: number }> {
    const skip = Math.max(0, (page - 1) * limit);
    const queryBuilder = this.cuponRepositoryRead.createQueryBuilder('cupon');

    if (filters.codigo) {
      queryBuilder.andWhere('cupon.codigo LIKE :codigo', { codigo: `%${filters.codigo}%` });
    }
    if (filters.activo !== undefined) {
      queryBuilder.andWhere('cupon.activo = :activo', { activo: filters.activo });
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

  async obtenerPorCodigo(codigo: string): Promise<Cupon> {
    const cupon = await this.cuponRepositoryRead.findOne({ where: { codigo } });
    if (!cupon) {
      throw new NotFoundException(`Cupón con código ${codigo} no encontrado`);
    }
    return cupon;
  }

  async validarCuponBase(codigo: string, montoCarrito: number): Promise<{ valido: boolean, descuentoAplicable: number, mensaje?: string }> {
    const cupon = await this.cuponRepositoryRead.findOne({ where: { codigo, activo: true } });
    
    if (!cupon) return { valido: false, descuentoAplicable: 0, mensaje: 'Cupón no existe o está inactivo' };
    
    const hoy = new Date();
    if (hoy < cupon.fechaInicio || hoy > cupon.fechaFin) {
      return { valido: false, descuentoAplicable: 0, mensaje: 'El cupón no está dentro del periodo válido' };
    }

    if (cupon.limiteUsos > 0 && cupon.usosActuales >= cupon.limiteUsos) {
      return { valido: false, descuentoAplicable: 0, mensaje: 'El cupón ha alcanzado su límite de usos' };
    }

    if (cupon.montoMinimoCompra > 0 && montoCarrito < cupon.montoMinimoCompra) {
      return { valido: false, descuentoAplicable: 0, mensaje: `El monto mínimo de compra debe ser ${cupon.montoMinimoCompra}` };
    }

    let descuentoAplicable = 0;
    if (cupon.tipoDescuento === 'PORCENTAJE') {
      descuentoAplicable = montoCarrito * (cupon.valorDescuento / 100);
    } else {
      descuentoAplicable = cupon.valorDescuento;
      if (descuentoAplicable > montoCarrito) {
        descuentoAplicable = montoCarrito;
      }
    }

    return { valido: true, descuentoAplicable, mensaje: 'Cupón válido' };
  }

  async registrarUsoCupon(codigo: string): Promise<Cupon> {
    const cupon = await this.cuponRepository.findOne({ where: { codigo } });
    if (!cupon) throw new NotFoundException('Cupón no encontrado');
    
    cupon.usosActuales += 1;
    return await this.cuponRepository.save(cupon);
  }

  async desactivarCupon(id: number): Promise<Cupon> {
    const cupon = await this.cuponRepository.findOne({ where: { id } });
    if (!cupon) throw new NotFoundException('Cupón no encontrado');
    
    cupon.activo = false;
    return await this.cuponRepository.save(cupon);
  }
}
