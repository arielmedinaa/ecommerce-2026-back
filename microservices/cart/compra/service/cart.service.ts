import { Cart } from '../../schemas/cart.schema';
import { Transaccion } from '../../schemas/transaccion.schema';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObtenerClaveService } from '@cart/common/utils/obtenerClave';
import { NEW_CART_INITIAL_STATE } from '../constants/cart.constants';

@Injectable()
export class CartContadoService {
  constructor(
    @InjectModel(Cart.name) private readonly carrito: Model<Cart>,
    @InjectModel(Transaccion.name)
    private readonly transacciones: Model<Transaccion>,
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

    // Crear filtro de búsqueda
    const filtro: any = {
      $or: [{ 'cliente.equipo': clienteToken }, { 'cliente.correo': cuenta }],
    };

    if (codigo === 0) {
      filtro.estado = 1;
    } else if (codigo) {
      filtro.codigo = codigo;
    }

    const carritoExistente = await this.carrito
      .findOne(filtro)
      .sort({ codigo: -1 });

    if (carritoExistente) {
      if (carritoExistente.proceso) {
        const transaccion = await this.transacciones.findOne({
          carrito: carritoExistente.codigo,
          estado: 1,
        });

        if (transaccion) {
          await this.transacciones.updateOne(
            { codigo: transaccion.codigo },
            { $set: { estado: 0 } },
          );
        }

        await this.carrito.updateOne(
          { codigo: carritoExistente.codigo },
          { $set: { proceso: '' } },
        );
      }

      const productoExiste = await this.carrito.findOne({
        ...filtro,
        'articulos.contado.codigo': producto.codigo,
      });

      if (productoExiste) {
        await this.carrito.updateOne(
          { ...filtro, 'articulos.contado.codigo': producto.codigo },
          { $inc: { 'articulos.contado.$.cantidad': producto.cantidad } },
        );
      } else {
        await this.carrito.updateOne(filtro, {
          $push: { 'articulos.contado': producto },
        });
      }

      return {
        data: [],
        success: true,
        message: 'PRODUCTO AGREGADO AL CARRITO',
      };
    }

    const nuevoCodigo = await this.obtenerClaveService.obtenerClave('carrito');
    const nuevoCarrito = new this.carrito({
      ...NEW_CART_INITIAL_STATE(nuevoCodigo, clienteToken, cuenta),
      articulos: {
        contado: [producto],
        credito: [],
      },
    });

    await nuevoCarrito.save();

    return {
      data: [nuevoCarrito],
      success: true,
      message: 'CARRITO CREADO CON ÉXITO',
    };
  }
}
