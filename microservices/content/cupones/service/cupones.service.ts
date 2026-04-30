import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cupon } from '../schemas/cupon.schema';
import { CuponesPorProducto } from '../schemas/cupon-productos.schema';
import { CreateCuponDto } from '../schemas/dto/create-cupon.dto';
import { AsignarCuponesProductosDTO } from '../schemas/dto/asignar-cupones-productos.dto';

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
  
  async obtenerCuponesPorProducto(productId: number): Promise<{data: CuponesPorProducto[]; message: string; success: boolean}> {
    const cuponesPorProducto = await this.cuponPorProductoRepositoryRead.find({
      where: { 
        productoId: productId,
        activo: true 
      },
      relations: ['cupon'],
    });

    return {
      data: cuponesPorProducto,
      message: 'Cupones obtenidos exitosamente',
      success: true,
    };
  }

  async asignarCuponPorProducto(data: AsignarCuponesProductosDTO): Promise<{data: any; message: string; success: boolean}> {
    try {
      if (!data.productos || data.productos.length === 0) {
        return {
          data: [],
          message: 'NO SE PROPORCIONARON PRODUCTOS PARA ASIGNAR',
          success: false,
        };
      }

      const combinacionesUnicas = new Set<string>();
      const duplicadosEncontrados: Array<{cuponId: number, productoId: number}> = [];
      data.productos.forEach(producto => {
        const combinacion = `${producto.cuponId}-${producto.productoId}`;
        if (combinacionesUnicas.has(combinacion)) {
          duplicadosEncontrados.push({
            cuponId: producto.cuponId,
            productoId: producto.productoId
          });
        } else {
          combinacionesUnicas.add(combinacion);
        }
      });

      if (duplicadosEncontrados.length > 0) {
        const mensajesErrores = duplicadosEncontrados.map(dup => 
          `Cupón ID ${dup.cuponId} - Producto ID ${dup.productoId}`
        );
        return {
          data: duplicadosEncontrados,
          message: `COMBINACIONES DUPLICADAS ENCONTRADAS: ${mensajesErrores.join(', ')}`,
          success: false,
        };
      }

      const relacionesExistentes = await this.cuponPorProductoRepositoryRead.find({
        where: data.productos.map(p => ({
          cuponId: p.cuponId,
          productoId: p.productoId
        }))
      });

      if (relacionesExistentes.length > 0) {
        const mensajesRelaciones = relacionesExistentes.map(rel => 
          `Cupón ID ${rel.cuponId} - Producto ID ${rel.productoId}`
        );
        return {
          data: relacionesExistentes,
          message: `ALGUNAS RELACIONES YA EXISTEN: ${mensajesRelaciones.join(', ')}`,
          success: false,
        };
      }

      const entidadesParaGuardar = data.productos.map(producto => {
        const entidad = new CuponesPorProducto();
        entidad.cuponId = producto.cuponId;
        entidad.codigoCupon = producto.codigoCupon;
        entidad.productoId = producto.productoId;
        entidad.codigoProducto = producto.codigoProducto;
        entidad.limiteUsos = producto.limiteUsos ?? 0;
        entidad.activo = producto.activo ?? true;
        return entidad;
      });

      const relacionesGuardadas = await this.cuponPorProductoRepository.save(entidadesParaGuardar);

      return {
        data: relacionesGuardadas,
        message: `${relacionesGuardadas.length} PRODUCTOS ASIGNADOS EXITOSAMENTE A LOS CUPONES`,
        success: true,
      };
    } catch (error) {
      this.logger.error('ERROR AL INTENTAR ASIGNAR CUPÓN(ES) A PRODUCTO(S)', error);
      throw new BadRequestException('Error al intentar asignar cupón(es) a producto(s)');
    }
  }

  async desasignarCuponPorProducto(data: AsignarCuponesProductosDTO) {
    try {
      const relacionesExistentes = await this.cuponPorProductoRepository.find({
        where: data.productos.map(p => ({
          cuponId: p.cuponId,
          productoId: p.productoId
        }))
      });

      if (relacionesExistentes.length === 0) {
        return {
          data: [],
          message: 'NO HAY RELACIONES PARA ELIMINAR',
          success: false,
        };
      }

      const relacionesEliminadas = await this.cuponPorProductoRepository.remove(relacionesExistentes);
      return {
        data: relacionesEliminadas,
        message: `${relacionesEliminadas.length} RELACIONES DESASIGNADAS EXITOSAMENTE`,
        success: true,
      };
    } catch (error) {
      this.logger.error('ERROR AL INTENTAR DESASIGNAR CUPÓN(ES) DE PRODUCTO(S)', error);
      throw new BadRequestException('Error al intentar desasignar cupón(es) de producto(s)');
    }
  }
}
