import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfertasValidationService } from './errors/ofertas.spec';
import { Oferta } from '../schemas/oferta.schemas';
import { ProductoOferta } from '../schemas/producto-oferta.schemas';
import { ProductsUtils } from '../utils/utils-products';

@Injectable()
export class OfertasService {
  private readonly logger = new Logger(OfertasService.name);

  constructor(
    @InjectRepository(Oferta, 'OFERTAS_CONNECTION')
    private readonly ofertaWriteRepository: Repository<Oferta>,
    @InjectRepository(Oferta, 'OFERTAS_CONNECTION_READ')
    private readonly ofertaReadRepository: Repository<Oferta>,
    @InjectRepository(ProductoOferta, 'OFERTAS_CONNECTION')
    private readonly productoOfertaWriteRepository: Repository<ProductoOferta>,
    @InjectRepository(ProductoOferta, 'OFERTAS_CONNECTION_READ')
    private readonly productoOfertaReadRepository: Repository<ProductoOferta>,
    private readonly ofertasValidationService: OfertasValidationService,
    private readonly productsUtils: ProductsUtils,
  ) { }

  async createOrUpdateOferta(
    createData: any,
    codigo?: number,
  ): Promise<{ data: any; message: string; success: boolean }> {
    const validation = await this.ofertasValidationService.validateOfertaPayload(
      createData,
      codigo,
    );

    if (!validation.isValid) {
      return validation.error;
    }

    try {
      if (codigo) {
        const existingOferta = await this.ofertaReadRepository.findOne({
          where: { id: codigo },
          relations: ['productos'],
        });

        if (!existingOferta) {
          return {
            data: [],
            message: 'OFERTA NO ENCONTRADA',
            success: false,
          };
        }

        existingOferta.titulo = createData.titulo || existingOferta.titulo;
        existingOferta.descripcion = createData.descripcion || existingOferta.descripcion;
        existingOferta.tiempoActivo = createData.tiempoActivo || existingOferta.tiempoActivo;
        existingOferta.activo = createData.activo !== undefined ? createData.activo : existingOferta.activo;
        existingOferta.updatedBy = createData.updatedBy;

        await this.productoOfertaWriteRepository.remove(existingOferta.productos);
        const productosConCuotas = await this.productsUtils.calculoCreditoProductosOferta(createData.productos);
        const nuevosProductos = productosConCuotas.map((producto: any) => {
          return this.productoOfertaWriteRepository.create({
            oferta: existingOferta,
            codigo_articulo: producto.codigo_articulo,
            nombre_articulo: producto.nombre_articulo,
            precioContado: producto.precioContado,
            precioCredito: producto.precioCredito,
            cuotas: producto.cuotas,
          });
        });

        existingOferta.productos = await this.productoOfertaWriteRepository.save(nuevosProductos);
        const updatedOferta = await this.ofertaWriteRepository.save(existingOferta);

        return {
          data: updatedOferta,
          message: 'OFERTA ACTUALIZADA EXITOSAMENTE',
          success: true,
        };
      } else {
        const newOferta = this.ofertaWriteRepository.create({
          titulo: createData.titulo,
          descripcion: createData.descripcion,
          tiempoActivo: createData.tiempoActivo,
          createdBy: createData.createdBy,
          activo: createData.activo !== undefined ? createData.activo : true,
        });

        const savedOferta = await this.ofertaWriteRepository.save(newOferta);
        const productosConCuotas = await this.productsUtils.calculoCreditoProductosOferta(createData.productos);
        const nuevosProductos = productosConCuotas.map((producto: any) => {
          return this.productoOfertaWriteRepository.create({
            oferta: savedOferta,
            codigo_articulo: producto.codigo_articulo,
            nombre_articulo: producto.nombre_articulo,
            precioContado: producto.precioContado,
            precioCredito: producto.precioCredito,
            cuotas: producto.cuotas,
          });
        });

        savedOferta.productos = await this.productoOfertaWriteRepository.save(nuevosProductos);

        return {
          data: savedOferta,
          message: 'OFERTA CREADA EXITOSAMENTE',
          success: true,
        };
      }
    } catch (error) {
      this.logger.error('Error createOrUpdateOferta', error);
      return {
        data: [],
        message: `Error al crear/actualizar la oferta: ${error.message}`,
        success: false,
      };
    }
  }

  async getActiveOferta(): Promise<{
    data: any;
    message: string;
    success: boolean;
  }> {
    try {
      const oferta = await this.ofertaReadRepository.findOne({
        where: { activo: true },
        relations: ['productos'],
      });
      return {
        data: oferta,
        message: oferta ? 'Oferta activa encontrada' : 'No hay ofertas activas',
        success: true,
      };
    } catch (error) {
      return {
        data: [],
        message: `Error al obtener la oferta activa: ${error.message}`,
        success: false,
      };
    }
  }

  async getAllOfertas(filters: {limit: number; offset: number}): Promise<{
    data: any[];
    message: string;
    success: boolean;
  }> {
    try {
      const ofertas = await this.ofertaReadRepository.find({
        relations: ['productos'],
        order: { createdAt: 'DESC' },
        take: filters.limit,
        skip: filters.offset,
      });

      const ofertasConCuotas = await Promise.all(ofertas.map(async (oferta) => {
        const productosConCuotas = await this.productsUtils.calculoCreditoProductosOferta(oferta.productos);
        
        return {
          ...oferta,
          productos: productosConCuotas
        };
      }));

      return {
        data: ofertasConCuotas,
        message: 'Ofertas obtenidas exitosamente',
        success: true,
      };
    } catch (error) {
      return {
        data: [],
        message: `Error al obtener las ofertas: ${error.message}`,
        success: false,
      };
    }
  }

  async deleteOferta(
    id: string | number,
  ): Promise<{ data: null; message: string; success: boolean }> {
    const idValidation = await this.ofertasValidationService.validateOfertaId(id);

    if (!idValidation.isValid) {
      return idValidation.error;
    }

    try {
      const oferta = await this.ofertaReadRepository.findOne({
        where: { id: Number(id) },
        relations: ['productos']
      });
      if (!oferta) {
        return {
          data: null,
          message: 'Oferta no encontrada',
          success: false,
        };
      }

      await this.ofertaWriteRepository.remove(oferta);

      return {
        data: null,
        message: 'Oferta eliminada exitosamente',
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        message: `Error al eliminar la oferta: ${error.message}`,
        success: false,
      };
    }
  }

  async toggleOfertaStatus(
    id: string | number,
  ): Promise<{ data: any; message: string; success: boolean }> {
    const idValidation = await this.ofertasValidationService.validateOfertaId(id);

    if (!idValidation.isValid) {
      return idValidation.error;
    }

    try {
      const oferta = await this.ofertaReadRepository.findOne({
        where: { id: Number(id) },
        relations: ['productos']
      });
      if (!oferta) {
        return {
          data: [],
          message: 'Oferta no encontrada',
          success: false,
        };
      }

      oferta.activo = !oferta.activo;
      const updatedOferta = await this.ofertaWriteRepository.save(oferta);

      return {
        data: updatedOferta,
        message: `Oferta ${updatedOferta?.activo ? 'activada' : 'desactivada'} exitosamente`,
        success: true,
      };
    } catch (error) {
      return {
        data: [],
        message: `Error al cambiar el estado de la oferta: ${error.message}`,
        success: false,
      };
    }
  }
}
