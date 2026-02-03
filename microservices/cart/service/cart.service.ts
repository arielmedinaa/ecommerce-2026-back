import { Cart } from '../schemas/cart.schema';
import { Transaccion } from '../schemas/transaccion.schema';
import { Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ObtenerClaveService } from '@shared/common/utils/obtenerClave';
import { NEW_CART_INITIAL_STATE } from '@cart/constants/cart.constants';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { CartValidationService } from './cart.service.spec';
import { CartErrorService } from './errors/cart-error.service';
import moment from 'moment-timezone';

@Injectable()
export class CartContadoService {
  constructor(
    @InjectModel(Cart.name) private readonly carrito: Model<Cart>,
    @InjectModel(Transaccion.name)
    private readonly transacciones: Model<Transaccion>,
    @Inject('PRODUCTS_SERVICE') private readonly productsService: ClientProxy,
    @Inject('PAYMENTS_SERVICE') private readonly paymentsService: ClientProxy,
    private readonly obtenerClaveService: ObtenerClaveService,
    private readonly cartValidationService: CartValidationService,
    private readonly cartErrorService: CartErrorService,
  ) {}

  async addCart(
    clienteToken: string,
    cuenta: string,
    codigo?: number,
    producto?: any,
  ): Promise<{ data: Cart[]; success: boolean; message: string }> {
    const validation = await this.cartValidationService.validateCartPayload(
      clienteToken,
      cuenta,
      codigo,
      producto,
    );

    if (!validation.isValid) {
      return validation.error;
    }

    const filtro: any = {
      $or: [{ 'cliente.equipo': clienteToken }, { 'cliente.correo': cuenta }],
    };
    codigo === 0 ? (filtro.estado = 1) : (filtro.codigo = codigo);

    const articuloTipo = producto.credito ? 'credito' : 'contado';
    const carritoExistente = await this.carrito
      .findOne(filtro)
      .sort({ codigo: -1 });

    if (!carritoExistente) {
      const nuevoCodigo =
        await this.obtenerClaveService.obtenerClave('carrito');
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

    const productoExiste = carritoExistente.articulos[articuloTipo].find(
      (articulo: any) => String(articulo.codigo) === String(producto.codigo),
    );

    if (productoExiste) {
      carritoExistente.articulos[articuloTipo] = carritoExistente.articulos[
        articuloTipo
      ].map((articulo: any) =>
        String(articulo.codigo) === String(producto.codigo)
          ? { ...articulo, cantidad: articulo.cantidad + producto.cantidad }
          : articulo,
      );

      await this.carrito.updateOne(
        { codigo: carritoExistente.codigo },
        {
          $set: {
            [`articulos.${articuloTipo}`]:
              carritoExistente.articulos[articuloTipo],
          },
        },
      );
    } else {
      carritoExistente.articulos[articuloTipo].push(producto);
      await this.carrito.updateOne(
        { codigo: carritoExistente.codigo },
        { $push: { [`articulos.${articuloTipo}`]: producto } },
      );
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
      $or: [{ 'cliente.equipo': clienteToken }, { 'cliente.correo': cuenta }],
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

  async finishCart(
    clienteToken: string,
    cuenta?: string,
    codigo?: number,
    process?: any,
  ): Promise<{
    data: any[];
    success: boolean;
    message: string;
  }> {
    const validation = await this.cartValidationService.validateFinishCart(
      clienteToken,
      cuenta,
      codigo,
      process,
    );

    if (!validation.isValid) {
      return validation.error;
    }

    let filtro: any = {
      'cliente.equipo': clienteToken,
      codigo,
    };
    if (cuenta) {
      filtro.cuenta = cuenta;
    }

    const carrito = await this.carrito.findOne(filtro).lean();
    if (!carrito) {
      const error = new Error('CARRITO NO ENCONTRADO');
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'finishCart',
        {
          motivo: 'carrito_no_encontrado',
          filtro,
          codigo,
        },
      );
      throw error;
    }

    let metodoPago = '';
    let montoTotal = 0;
    let descripcion = '';

    if (process.tipo === 'Debito contra Entrega') {
      metodoPago = 'efectivo contra entrega';
      if (process.cuotas && Array.isArray(process.cuotas)) {
        montoTotal = process.cuotas.reduce((total, cuota) => total + cuota.importe, 0);
      }
      descripcion = `Débito contra entrega - ${process.cantidadcuotas} cuotas`;
    } else if (process.tipo && process.tipo.toLowerCase().includes('pagopar')) {
      metodoPago = 'pagopar';
      montoTotal = process.monto || 0;
      descripcion = 'Pago PagoPar';
    } else if (process.tipo && process.tipo.toLowerCase().includes('bancard')) {
      metodoPago = 'bancard';
      montoTotal = process.monto || 0;
      descripcion = 'Pago Bancard';
    } else if (process.tipo && process.tipo.toLowerCase().includes('tarjeta contra entrega')) {
      metodoPago = 'tarjeta contra entrega';
      montoTotal = process.monto || 0;
      descripcion = 'Tarjeta contra entrega';
    } else {
      metodoPago = 'efectivo contra entrega';
      montoTotal = process.monto || 0;
      descripcion = process.tipo || 'Pago contra entrega';
    }

    const clienteInfo = {
      equipo: clienteToken,
      nombre: carrito.cliente?.nombre || '',
      email: carrito.cliente?.correo || cuenta || '',
      telefono: carrito.cliente?.telefono || '',
      documento: carrito.cliente?.documento || '',
    };

    try {
      const pagoResponse = await firstValueFrom(
        this.paymentsService.send(
          { cmd: 'registrar_pago' },
          {
            codigoCarrito: codigo,
            carrito: carrito,
            metodoPago: metodoPago,
            monto: montoTotal,
            moneda: process.moneda || 'PYG',
            cliente: clienteInfo,
            descripcion: descripcion,
            respuestaPagopar: metodoPago === 'pagopar' ? process.pagoparResponse || {} : {},
            respuestaBancard: metodoPago === 'bancard' ? process.bancardResponse || {} : {},
          },
        ),
      );

      if (!pagoResponse.success) {
        const error = new Error(`ERROR AL REGISTRAR PAGO: ${pagoResponse.message}`);
        await this.cartErrorService.logMicroserviceError(
          error,
          codigo?.toString(),
          'finishCart',
          {
            motivo: 'error_registro_pago',
            pagoResponse,
            codigo,
          },
        );
        throw error;
      }

      await this.carrito.updateOne(filtro, {
        $set: {
          pago: {
            ...process,
            pagoId: pagoResponse.data.idTransaccion,
            registradoEnPayments: true,
          },
          estado: 0,
          finished: moment()
            .tz('America/Asuncion')
            .format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
        },
      });

      return {
        data: [pagoResponse.data],
        success: true,
        message: 'CARRITO FINALIZADO Y PAGO REGISTRADO CON ÉXITO',
      };
    } catch (error) {
      await this.cartErrorService.logMicroserviceError(
        error,
        codigo?.toString(),
        'finishCart',
        {
          motivo: 'error_finalizar_carrito',
          error: error.message,
          codigo,
        },
      );
      
      return {
        data: [],
        success: false,
        message: `ERROR AL FINALIZAR CARRITO: ${error.message}`,
      };
    }
  }
}
