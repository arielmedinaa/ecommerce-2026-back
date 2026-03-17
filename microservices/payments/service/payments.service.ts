import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../schemas/payments.schema';
import moment from 'moment-timezone';
import { PaymentErrorService } from './errors/payment-error.service';

@Injectable()
export class PaymentsService {

  constructor(
    @InjectRepository(Payment, 'WRITE_CONNECTION')
    private readonly paymentRepositoryWrite: Repository<Payment>,
    @InjectRepository(Payment, 'READ_CONNECTION')
    private readonly paymentRepositoryRead: Repository<Payment>,
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
  ): Promise<{ data: Payment | null; success: boolean; message: string }> {
    const idTransaccion = this.generarIdTransaccion();
    try {
      const nuevoPago = this.paymentRepositoryWrite.create({
        codigoCarrito,
        carrito,
        estado: 'pendiente',
        metodoPago,
        monto,
        moneda,
        idTransaccion,
        descripcion: descripcion || `Pago del carrito ${codigoCarrito}`,
        cliente: cliente || {
          equipo: '',
          nombre: '',
          email: '',
          telefono: '',
          documento: '',
          nroDocumento: '',
        },
        respuestaPagopar: respuestaPagopar || {},
        respuestaBancard: respuestaBancard || {},
        metadatos: {},
        procesado: new Date(),
        expira: this.calcularFechaExpiracion(metodoPago),
      });

      await this.paymentRepositoryWrite.save(nuevoPago);
      return {
        data: nuevoPago,
        success: true,
        message: 'PAGO REGISTRADO CON ÉXITO',
      };
    } catch (error) {
      this.paymentErrorService.logMicroserviceError(
        error,
        idTransaccion,
        'registrarPago',
      );
      return {
        data: null,
        success: false,
        message: `ERROR AL REGISTRAR PAGO: ${error.message}`,
      };
    }
  }

  async listarPagosPorCarrito(
    codigoCarrito: number,
  ): Promise<{ data: Payment[]; success: boolean; message: string }> {
    try {
      const pagos = await this.paymentRepositoryRead.find({
        where: { codigoCarrito },
        order: { codigoCarrito: 'DESC' },
      });

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
      const pagos = await this.paymentRepositoryRead
        .createQueryBuilder('payment')
        .where('payment.codigoCarrito = :codigoCarrito', { codigoCarrito })
        .andWhere("JSON_EXTRACT(payment.reembolsos, '$') IS NOT NULL AND JSON_EXTRACT(payment.reembolsos, '$') != '[]'")
        .getMany();

      if (!pagos || pagos.length === 0) {
        return {
          data: [],
          success: false,
          message: 'NO SE ENCONTRARON REEMBOLSOS PARA ESTE CARRITO',
        };
      }

      const todosReembolsos = pagos.flatMap((pago) => pago.reembolsos || []);

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
      const pagoRechazado = await this.paymentRepositoryRead.findOne({
        where: {
          codigoCarrito,
          estado: 'fallido',
        },
        order: { createdAt: 'DESC' },
      });

      if (!pagoRechazado || !pagoRechazado.motivoFallo) {
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
  ): Promise<{ data: Payment | null; success: boolean; message: string }> {
    try {
      const updateData: any = {
        estado,
      };

      if (estado === 'completado') {
        updateData.finalizado = moment().tz('America/Asuncion').toDate();
        updateData.finalizadoFlag = true;
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

      const pagoActualizado = await this.paymentRepositoryRead.findOne({
        where: { idTransaccion },
      });

      if (!pagoActualizado) {
        return {
          data: null,
          success: false,
          message: 'NO SE ENCONTRÓ EL PAGO PARA ACTUALIZAR',
        };
      }

      // Actualizar campos
      Object.assign(pagoActualizado, updateData);
      await this.paymentRepositoryWrite.save(pagoActualizado);

      return {
        data: pagoActualizado,
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
