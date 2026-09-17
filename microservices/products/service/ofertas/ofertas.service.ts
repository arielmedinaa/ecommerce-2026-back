import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OfertasValidationService } from '../errors/ofertas.spec';
import { Oferta } from '../../schemas/ofertas/oferta.schemas';
import { ProductoOferta } from '../../schemas/ofertas/producto-oferta.schemas';
import { ProductsImage } from '../../schemas/products/products-image.schema';
import { Product } from '../../schemas/products/product.schemas';
import { ProductsUtils } from '../../utils/products/utils-products';

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
    @InjectRepository(ProductsImage, 'READ_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly productsImagesReadRepository: Repository<ProductsImage>,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly erpReadRepository: Repository<Product>,
    private readonly ofertasValidationService: OfertasValidationService,
    private readonly productsUtils: ProductsUtils,
  ) { }

  private async attachImagenes(productos: any[]): Promise<any[]> {
    if (!Array.isArray(productos) || productos.length === 0) return productos;
    const codigos = Array.from(
      new Set(productos.map((p) => String(p?.codigo_articulo ?? '').trim()).filter(Boolean)),
    );
    if (codigos.length === 0) return productos;

    const imagenes = await this.productsImagesReadRepository
      .createQueryBuilder('img')
      .where('img.producto_codigo IN (:...codigos)', { codigos })
      .andWhere('img.activo = :activo', { activo: true })
      .orderBy('img.orden', 'ASC')
      .getMany();

    const imagenesMap = new Map<string, string[]>();
    for (const img of imagenes) {
      const codigo = img.producto_codigo;
      if (!imagenesMap.has(codigo)) imagenesMap.set(codigo, []);
      imagenesMap.get(codigo)!.push(img.url_imagen);
    }

    return productos.map((p) => ({
      ...p,
      imagenes: imagenesMap.get(String(p?.codigo_articulo ?? '').trim()) || [],
    }));
  }

  private async attachCategoriaMarca(productos: any[]): Promise<any[]> {
    if (!Array.isArray(productos) || productos.length === 0) return productos;
    const codigos = Array.from(
      new Set(productos.map((p) => String(p?.codigo_articulo ?? '').trim()).filter(Boolean)),
    );
    if (codigos.length === 0) return productos;

    const articulos = await this.erpReadRepository.find({
      where: { codigo_articulo: In(codigos) },
      select: ['codigo_articulo', 'familia', 'subfamilia', 'marca'],
    });

    const familiaCodigos = Array.from(new Set(articulos.map((a) => a.familia).filter(Boolean)));
    const subfamiliaCodigos = Array.from(new Set(articulos.map((a) => a.subfamilia).filter(Boolean)));
    const marcaCodigos = Array.from(new Set(articulos.map((a) => a.marca).filter(Boolean)));

    const [familias, subfamilias, marcas] = await Promise.all([
      familiaCodigos.length
        ? this.erpReadRepository.query(
            `SELECT codigo, nombre FROM familia WHERE codigo IN (${familiaCodigos.map(() => '?').join(',')})`,
            familiaCodigos,
          )
        : [],
      subfamiliaCodigos.length
        ? this.erpReadRepository.query(
            `SELECT codigo, nombre FROM subfamilia WHERE codigo IN (${subfamiliaCodigos.map(() => '?').join(',')})`,
            subfamiliaCodigos,
          )
        : [],
      marcaCodigos.length
        ? this.erpReadRepository.query(
            `SELECT codigo, nombre FROM marca WHERE codigo IN (${marcaCodigos.map(() => '?').join(',')})`,
            marcaCodigos,
          )
        : [],
    ]);

    const familiaMap = new Map(familias.map((f: any) => [String(f.codigo), f.nombre]));
    const subfamiliaMap = new Map(subfamilias.map((sf: any) => [String(sf.codigo), sf.nombre]));
    const marcaMap = new Map(marcas.map((m: any) => [String(m.codigo), m.nombre]));
    const articuloMap = new Map(articulos.map((a) => [String(a.codigo_articulo).trim(), a]));

    return productos.map((p) => {
      const articulo = articuloMap.get(String(p?.codigo_articulo ?? '').trim());
      return {
        ...p,
        codigo_categoria: articulo?.familia ?? null,
        nombre_categoria: articulo?.familia ? familiaMap.get(String(articulo.familia)) ?? null : null,
        codigo_subcategoria: articulo?.subfamilia ?? null,
        nombre_subcategoria: articulo?.subfamilia ? subfamiliaMap.get(String(articulo.subfamilia)) ?? null : null,
        codigo_marca: articulo?.marca ?? null,
        nombre_marca: articulo?.marca ? marcaMap.get(String(articulo.marca)) ?? null : null,
      };
    });
  }

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
        existingOferta.combosHabilitado = createData.combosHabilitado !== undefined ? !!createData.combosHabilitado : existingOferta.combosHabilitado;
        existingOferta.comboDescuento = createData.comboDescuento !== undefined ? Number(createData.comboDescuento) || 0 : existingOferta.comboDescuento;
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
          combosHabilitado: !!createData.combosHabilitado,
          comboDescuento: Number(createData.comboDescuento) || 0,
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
      const oferta = await this.ofertaReadRepository
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.productos', 'productos')
        .where('o.activo = :activo', { activo: true })
        .andWhere('TIMESTAMPADD(SECOND, o.tiempoActivo, o.createdAt) > NOW()')
        .getOne();
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

  async getOfertaById(id: number): Promise<{
    data: any;
    message: string;
    success: boolean;
  }> {
    try {
      const oferta = await this.ofertaReadRepository.findOne({
        where: { id },
        relations: ['productos'],
      });
      if (!oferta) {
        return { data: null, message: 'Oferta no encontrada', success: false };
      }
      const productosConCuotas =
        await this.productsUtils.calculoCreditoProductosOferta(oferta.productos);
      const productosConPromo =
        await this.productsUtils.aplicarPreciosPromoOferta(productosConCuotas);
      const productosConCategoriaMarca = await this.attachCategoriaMarca(productosConPromo);
      return {
        data: { ...oferta, productos: productosConCategoriaMarca },
        message: 'Oferta encontrada',
        success: true,
      };
    } catch (error) {
      return {
        data: null,
        message: `Error al obtener la oferta: ${error.message}`,
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
      const ofertas = await this.ofertaReadRepository
        .createQueryBuilder('o')
        .leftJoinAndSelect('o.productos', 'productos')
        .where('o.activo = :activo', { activo: true })
        .andWhere('TIMESTAMPADD(SECOND, o.tiempoActivo, o.createdAt) > NOW()')
        .orderBy('o.createdAt', 'DESC')
        .take(filters.limit)
        .skip(filters.offset)
        .getMany();

      const ofertasConCuotas = await Promise.all(ofertas.map(async (oferta) => {
        const productosConCuotas = await this.productsUtils.calculoCreditoProductosOferta(oferta.productos);
        const productosConPromo = await this.productsUtils.aplicarPreciosPromoOferta(productosConCuotas);
        const productosConImagenes = await this.attachImagenes(productosConPromo);
        const productosConCategoriaMarca = await this.attachCategoriaMarca(productosConImagenes);

        return {
          ...oferta,
          productos: productosConCategoriaMarca
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

  @Cron('*/5 * * * *')
  async deactivateExpiredOfertas(): Promise<void> {
    try {
      await this.ofertaWriteRepository
        .createQueryBuilder()
        .update(Oferta)
        .set({ activo: false })
        .where('activo = :activo', { activo: true })
        .andWhere('TIMESTAMPADD(SECOND, tiempoActivo, createdAt) <= NOW()')
        .execute();
    } catch (error) {
      this.logger.error(`Error desactivando ofertas vencidas: ${error.message}`);
    }
  }
}
