import { Cart } from '../schemas/cart.schema';
import { Transaccion } from '../schemas/transaccion.schema';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObtenerClaveService } from '@cart/common/utils/obtenerClave';
import { NEW_CART_INITIAL_STATE } from '@cart/constants/cart.constants';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CartContadoService {
  constructor(
    @InjectModel(Cart.name) private readonly carrito: Model<Cart>,
    @InjectModel(Transaccion.name) private readonly transacciones: Model<Transaccion>,
    @Inject('PRODUCTS_SERVICE') private readonly productsService: ClientProxy,
    private readonly obtenerClaveService: ObtenerClaveService,
  ) {}

  async addCart(
    clienteToken: string,
    cuenta: string,
    codigo?: number,
    producto?: any,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    
    if (!producto) {
      return { data: [], success: false, message: 'Producto no válido' };
    }

    const filtro: any = {
      $or: [{ 'cliente.equipo': clienteToken }, { 'cliente.correo': cuenta }],
    };
    codigo === 0 ? (filtro.estado = 1) : (filtro.codigo = codigo);

    console.log("filtro", filtro)

    const articuloTipo = producto.credito ? 'credito' : 'contado';
    const carritoExistente = await this.carrito.findOne(filtro).sort({ codigo: -1 });

    if (!carritoExistente) {
      const nuevoCodigo = await this.obtenerClaveService.obtenerClave('carrito');
      const nuevoCarrito = new this.carrito({
        ...NEW_CART_INITIAL_STATE(nuevoCodigo, clienteToken, cuenta),
        articulos: {
          [articuloTipo]: [producto],
          [articuloTipo === 'credito' ? 'contado' : 'credito']: [],
        },
      });
      await nuevoCarrito.save();
      return {
        data: [nuevoCarrito],
        success: true,
        message: 'CARRITO CREADO CON ÉXITO',
      };
    }

    if (carritoExistente.proceso) {
      await this.transacciones.updateOne(
        { carrito: carritoExistente.codigo, estado: 1 },
        { $set: { estado: 0 } },
      );
      await this.carrito.updateOne(
        { codigo: carritoExistente.codigo },
        { $set: { proceso: '' } },
      );
    }

    const productoExiste = await this.carrito.findOne({
      ...filtro,
      [`articulos.${articuloTipo}.codigo`]: producto.codigo,
    });

    if (productoExiste) {
      await this.carrito.updateOne(
        { ...filtro, [`articulos.${articuloTipo}.codigo`]: producto.codigo },
        { $inc: { [`articulos.${articuloTipo}.$.cantidad`]: producto.cantidad } },
      );
    } else {
      await this.carrito.updateOne(filtro, {
        $push: { [`articulos.${articuloTipo}`]: producto },
      });
    }

    return {
      data: [carritoExistente],
      success: true,
      message: 'PRODUCTO AGREGADO AL CARRITO',
    };
  }

  async getCart(
    clienteToken: string,
    cuenta?: string,
    codigo?: 0,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    const filtro: any = {
      $or: [
        { 'cliente.equipo': clienteToken },
        { 'cliente.correo': cuenta || { $exists: false } },
      ],
    };
    codigo === 0 ? (filtro.estado = 1) : (filtro.codigo = codigo);

    const resultado = await this.carrito
      .findOne(filtro, { _id: 0, proceso: 0, transaccion: 0, __v: 0 })
      .sort({ codigo: -1 })
      .lean();
    if (!resultado) {
      return { data: [], success: false, message: 'Carrito no encontrado' };
    }

    const articulosRaw = [...(resultado.articulos?.contado || [])];
    const codigos = [...new Set(articulosRaw.map((a) => String(a.codigo)))];
    try {
      const productos = await firstValueFrom(
        this.productsService.send(
          { cmd: 'get_products' },
          {
            ids: codigos,
            fields: 'codigo,marca,categorias,subcategorias,promos',
          },
        ),
      );

      const enriquecerArticulos = (lista: any[]) => {
        return lista.map((art) => {
          const p = productos.find((ip) => ip.codigo === String(art.codigo));

          return {
            ...art,
            marca: p?.marca || null,
            categoria: p?.categorias?.[0]?.nombre || null,
            subcategoria: p?.subcategorias?.[0]?.nombre || null,
            isCombo: p?.tipo === 'combo',
            isPromo: p?.promos && p.promos.length > 0,
            codigoPromo: p?.promos?.[0]?.codigo || null,
            nombrePromo: p?.promos?.[0]?.nombre || null,
          };
        });
      };
      if (resultado.articulos) {
        if (resultado.articulos.contado) {
          resultado.articulos.contado = enriquecerArticulos(
            resultado.articulos.contado,
          );
        }
      }
      return {
        data: [resultado],
        success: true,
        message: 'Carrito recuperado',
      };
    } catch (error) {
      return {
        data: [resultado],
        success: true,
        message: 'Carrito recuperado (sin información adicional de productos)',
      };
    }
  }
}
