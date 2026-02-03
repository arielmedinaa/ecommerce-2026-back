import { Controller } from '@nestjs/common';
import { PaymentsService } from '../service/payments.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @MessagePattern({ cmd: 'registrar_pago' })
  async registrarPago(@Payload() payload: {
    codigoCarrito: number;
    carrito: any;
    metodoPago: string;
    monto: number;
    moneda?: string;
    cliente?: any;
    descripcion?: string;
    respuestaPagopar?: any;
    respuestaBancard?: any;
  }) {
    return await this.paymentsService.registrarPago(
      payload.codigoCarrito,
      payload.carrito,
      payload.metodoPago,
      payload.monto,
      payload.moneda,
      payload.cliente,
      payload.descripcion,
      payload.respuestaPagopar,
      payload.respuestaBancard,
    );
  }

  @MessagePattern({ cmd: 'listar_pagos_carrito' })
  async listarPagosPorCarrito(@Payload() payload: {
    codigoCarrito: number;
  }) {
    return await this.paymentsService.listarPagosPorCarrito(
      payload.codigoCarrito,
    );
  }

  @MessagePattern({ cmd: 'obtener_reembolsos' })
  async obtenerReembolsos(@Payload() payload: {
    codigoCarrito: number;
  }) {
    return await this.paymentsService.obtenerReembolsos(
      payload.codigoCarrito,
    );
  }

  @MessagePattern({ cmd: 'ver_motivo_rechazo' })
  async verMotivoRechazo(@Payload() payload: {
    codigoCarrito: number;
  }) {
    return await this.paymentsService.verMotivoRechazo(
      payload.codigoCarrito,
    );
  }

  @MessagePattern({ cmd: 'actualizar_estado_pago' })
  async actualizarEstadoPago(@Payload() payload: {
    idTransaccion: string;
    estado: string;
    respuestaPagopar?: any;
    respuestaBancard?: any;
    motivoFallo?: string;
  }) {
    return await this.paymentsService.actualizarEstadoPago(
      payload.idTransaccion,
      payload.estado,
      payload.respuestaPagopar,
      payload.respuestaBancard,
      payload.motivoFallo,
    );
  }

  @MessagePattern({ cmd: 'health_check' })
  async healthCheck() {
    return {
      status: 'ok',
      service: 'payments',
      timestamp: new Date().toISOString(),
    };
  }
}
