import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cupon } from '../schemas/cupon.schema';
import { CreateCuponDto } from '../schemas/dto/create-cupon.dto';
import { CuponesPorProducto } from '../schemas/cupon-productos.schema';
import { CuponPorProductoDTO } from '../schemas/dto/cupon-productos.dto';

@Injectable()
export class CuponesService {
  private readonly logger = new Logger(CuponesService.name);

  constructor(
    @InjectRepository(Cupon, 'WRITE_CONNECTION')
    private readonly cuponRepository: Repository<Cupon>,

    @InjectRepository(Cupon, 'READ_CONNECTION')
    private readonly cuponRepositoryRead: Repository<Cupon>,

    @InjectRepository(CuponesPorProducto, 'WRITE_CONNECTION')
    private readonly cuponPorProductoRepository: Repository<CuponesPorProducto>,

    @InjectRepository(CuponesPorProducto, 'READ_CONNECTION')
    private readonly cuponPorProductoRepositoryRead: Repository<CuponesPorProducto>,
  ) {}

  async crearCupon(
    createCuponDto: CreateCuponDto,
  ): Promise<{ data: Cupon; message: string; success: boolean }> {
    try {
      const nuevoCupon = this.cuponRepository.create(createCuponDto);
      const savedCupon = await this.cuponRepository.save(nuevoCupon);
      return {
        data: savedCupon,
        message: 'CUPON CREADO CON EXITO',
        success: true,
      };
    } catch (error) {
      this.logger.error('Error al crear cupon', error);
      throw new BadRequestException(
        'Error al crear el cupón o el código ya existe.',
      );
    }
  }

  async obtenerTodos(
    page: number = 1,
    limit: number = 10,
    filters: any = {},
  ): Promise<{ cupones: Cupon[]; total: number; pages: number }> {
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

  async obtenerPorCodigo(codigo: string): Promise<Cupon> {
    const cupon = await this.cuponRepositoryRead.findOne({ where: { codigo } });
    if (!cupon) {
      throw new NotFoundException(`Cupón con código ${codigo} no encontrado`);
    }
    return cupon;
  }

  async obtenerPorId(id: number): Promise<number>{
    const cupon = await this.cuponRepositoryRead.findOne({ where: { id } });
    if (!cupon) {
      throw new NotFoundException(`Cupón con id ${id} no encontrado`);
    }
    return cupon.limiteUsuario;
  }

  async validarCuponBase(
    codigo: string,
    montoCarrito: number,
  ): Promise<{
    valido: boolean;
    descuentoAplicable: number;
    mensaje?: string;
  }> {
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
  
  async obtenerCuponesPorProducto(productId: number): Promise<{data: Cupon[]; message: string; success: boolean}> {
    const cuponesPorProducto = await this.cuponPorProductoRepositoryRead.find({
      where: { 
        productoId: productId,
        activo: true 
      },
      relations: ['cupon'],
    });

    console.log("CUPONES POR PRODCUTO", cuponesPorProducto)

    const cuponesValidos = cuponesPorProducto
      .map(c => c.cupon)
      .filter(cupon => {
        return cupon.activo && 
               cupon.fechaInicio && 
               cupon.fechaFin &&
               cupon.usosActuales
      });

    return {
      data: cuponesValidos,
      message: 'Cupones obtenidos exitosamente',
      success: true,
    };
  }

  async crearCuponPorProducto(data: CuponPorProductoDTO): Promise<{data: any; message: string; success: boolean}> {
    try {
      const cuponExistente = await this.cuponRepository.findOne({
        where: { id: data.cuponId }
      });
      
      if (!cuponExistente) {
        return {
          data: [],
          message: 'CUPON NO ENCONTRADO',
          success: false,
        }
      }

      const relacionExistente = await this.cuponPorProductoRepositoryRead.findOne({
        where: { 
          cuponId: data.cuponId,
          productoId: data.productoId 
        }
      });

      if (relacionExistente) {
        return {
          data: relacionExistente,
          message: `ESTE CUPÓN YA ESTÁ ASIGNADO A ESTE PRODUCTO. ID de relación: ${relacionExistente.id}, Cupón ID: ${relacionExistente.cuponId}, Producto ID: ${relacionExistente.productoId}`,
          success: false,
        }
      }

      const cuponPorProducto = this.cuponPorProductoRepository.create(data);
      const saved = await this.cuponPorProductoRepository.save(cuponPorProducto);
      
      return {
        data: {
          id: saved.id,
          cuponId: saved.cuponId,
          productoId: saved.productoId,
          cupon: cuponExistente
        },
        message: 'CUPÓN ASIGNADO AL PRODUCTO EXITOSAMENTE',
        success: true,
      };
    } catch (error) {
      this.logger.error('ERROR AL INTENTAR ASIGNAR UN CUPÓN A UN PRODUCTO', error);
      throw new BadRequestException('Error al intentar asignar un cupón a un producto');
    }
  }
}
