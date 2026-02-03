import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payments, PaymentsDocument } from '../schemas/payments.schema';
import moment from 'moment-timezone';
import { PaymentErrorService } from './errors/payment-error.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payments.name)
    private readonly paymentsModel: Model<PaymentsDocument>,
    private readonly paymentErrorService: PaymentErrorService,
  ) {}

  async registrarPago(
    codigoCarrito: number,
    carrito: any,
    metodoPago: string,
    monto: number,
    moneda: string = 'PYG',
    cliente?: any,
    descripcion?: string,
    respuestaPagopar?: any,
    respuestaBancard?: any,
  ): Promise<{ data: Payments | null; success: boolean; message: string }> {
    try {
      const idTransaccion = this.generarIdTransaccion();
      
      const nuevoPago = new this.paymentsModel({
        codigoCarrito,
        carrito,
        estado: 'pendiente',
        metodoPago,
        monto,
        moneda,
        idTransaccion,
        descripcion: descripcion || `Pago del carrito ${codigoCarrito}`,
        cliente: cliente || {},
        respuestaPagopar: respuestaPagopar || {},
        respuestaBancard: respuestaBancard || {},
        metadatos: {},
        procesado: new Date(),
        expira: this.calcularFechaExpiracion(metodoPago),
      });

      await nuevoPago.save();

      return {
        data: nuevoPago,
        success: true,
        message: 'PAGO REGISTRADO CON ÉXITO',
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: `ERROR AL REGISTRAR PAGO: ${error.message}`,
      };
    }
  }

  async listarPagosPorCarrito(
    codigoCarrito: number,
  ): Promise<{ data: Payments[]; success: boolean; message: string }> {
    try {
      const pagos = await this.paymentsModel
        .find({ codigoCarrito })
        .sort({ codigoCarrito: -1 })
        .lean();

      if (!pagos || pagos.length === 0) {
        return {
          data: [],
          success: false,
          message: 'NO SE ENCONTRARON PAGOS PARA ESTE CARRITO',
        };
      }

      return {
        data: pagos,
        success: true,
        message: 'PAGOS RECUPERADOS CON ÉXITO',
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        message: `ERROR AL LISTAR PAGOS: ${error.message}`,
      };
    }
  }

  async obtenerReembolsos(
    codigoCarrito: number,
  ): Promise<{ data: any[]; success: boolean; message: string }> {
    try {
      const pagos = await this.paymentsModel
        .find({
          codigoCarrito,
          'reembolsos.0': { $exists: true },
        })
        .lean();

      if (!pagos || pagos.length === 0) {
        return {
          data: [],
          success: false,
          message: 'NO SE ENCONTRARON REEMBOLSOS PARA ESTE CARRITO',
        };
      }

      const todosReembolsos = pagos.flatMap(pago => pago.reembolsos || []);

      return {
        data: todosReembolsos,
        success: true,
        message: 'REEMBOLSOS RECUPERADOS CON ÉXITO',
      };
    } catch (error) {
      return {
        data: [],
        success: false,
        message: `ERROR AL OBTENER REEMBOLSOS: ${error.message}`,
      };
    }
  }

  async verMotivoRechazo(
    codigoCarrito: number,
  ): Promise<{ data: any; success: boolean; message: string }> {
    try {
      const pagoRechazado = await this.paymentsModel
        .findOne({
          codigoCarrito,
          estado: 'fallido',
          motivoFallo: { $exists: true, $ne: null },
        })
        .sort({ createdAt: -1 })
        .lean();

      if (!pagoRechazado) {
        return {
          data: null,
          success: false,
          message: 'NO SE ENCONTRARON PAGOS RECHAZADOS PARA ESTE CARRITO',
        };
      }

      return {
        data: {
          idTransaccion: pagoRechazado.idTransaccion,
          metodoPago: pagoRechazado.metodoPago,
          monto: pagoRechazado.monto,
          motivoFallo: pagoRechazado.motivoFallo,
          fechaRechazo: pagoRechazado.createdAt,
          intentosReintentar: pagoRechazado.intentosReintentar,
        },
        success: true,
        message: 'MOTIVO DE RECHAZO RECUPERADO CON ÉXITO',
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: `ERROR AL OBTENER MOTIVO DE RECHAZO: ${error.message}`,
      };
    }
  }

  async actualizarEstadoPago(
    idTransaccion: string,
    estado: string,
    respuestaPagopar?: any,
    respuestaBancard?: any,
    motivoFallo?: string,
  ): Promise<{ data: Payments | null; success: boolean; message: string }> {
    try {
      const updateData: any = {
        estado,
      };

      if (estado === 'completado') {
        updateData.finalizado = moment()
          .tz('America/Asuncion')
          .toDate();
      }

      if (respuestaPagopar) {
        updateData.respuestaPagopar = respuestaPagopar;
      }

      if (respuestaBancard) {
        updateData.respuestaBancard = respuestaBancard;
      }

      if (motivoFallo) {
        updateData.motivoFallo = motivoFallo;
      }

      const pagoActualizado = await this.paymentsModel
        .findOneAndUpdate(
          { idTransaccion },
          { $set: updateData },
          { new: true },
        )
        .lean();

      if (!pagoActualizado) {
        return {
          data: null,
          success: false,
          message: 'NO SE ENCONTRÓ EL PAGO PARA ACTUALIZAR',
        };
      }

      return {
        data: pagoActualizado as Payments,
        success: true,
        message: 'ESTADO DE PAGO ACTUALIZADO CON ÉXITO',
      };
    } catch (error) {
      return {
        data: null,
        success: false,
        message: `ERROR AL ACTUALIZAR ESTADO DE PAGO: ${error.message}`,
      };
    }
  }

  private generarIdTransaccion(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN_${timestamp}_${random}`;
  }

  private calcularFechaExpiracion(metodoPago: string): Date {
    const ahora = new Date();
    
    switch (metodoPago) {
      case 'pagopar':
        return new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
      case 'bancard':
        return new Date(ahora.getTime() + 30 * 60 * 1000);
      case 'efectivo contra entrega':
      case 'tarjeta contra entrega':
        return new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(ahora.getTime() + 24 * 60 * 60 * 1000);
    }
  }
}
