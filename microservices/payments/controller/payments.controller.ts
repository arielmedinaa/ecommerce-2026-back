import { Controller, Logger } from '@nestjs/common';
import { PaymentsService } from '../service/payments.service';
import { VposService } from '../service/vpos.service';
import { PaymentsQueueService } from '../queue/payments.queue.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly vposService: VposService,
    private readonly paymentsQueue: PaymentsQueueService,
  ) {}

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

  @MessagePattern({ cmd: 'vpos_single_buy' })
  async vposSingleBuy(@Payload() payload: {
    codigoCarrito: number;
    carrito: any;
    monto: number;
    moneda?: string;
    cliente?: any;
    descripcion?: string;
    zimple?: string;
    return_url: string;
    cancel_url?: string;
    additional_data?: string;
  }) {

    const intent = await this.paymentsService.registrarPagoVpos(
      payload.codigoCarrito,
      payload.carrito,
      payload.monto,
      payload.moneda,
      payload.cliente,
      payload.descripcion,
      payload.zimple,
    );

    if (!intent.success) {
      return intent;
    }

    const shopProcessId = intent.data.shopProcessId;
    try {
      const vposResponse = await this.vposService.singleBuy({
        shop_process_id: shopProcessId,
        amount: payload.monto,
        currency: payload.moneda || 'PYG',
        description: payload.descripcion,
        return_url: payload.return_url,
        cancel_url: payload.cancel_url,
        additional_data: payload.additional_data,
        zimple: payload.zimple,
      });

      return {
        success: true,
        message: 'SINGLE BUY VPOS INICIADO',
        data: { ...intent.data, ...vposResponse },
      };
    } catch (error) {
      await this.paymentsService.marcarIntentoVposFallido(shopProcessId, error.message);
      return {
        success: false,
        message: `ERROR AL INICIAR SINGLE BUY VPOS: ${error.message}`,
        data: null,
      };
    }
  }

  @MessagePattern({ cmd: 'vpos_rollback' })
  async vposRollback(@Payload() payload: { shop_process_id: string }) {
    const result = await this.vposService.singleBuyRollback(payload);
    if (result.status === 'success') {
      await this.paymentsService.marcarIntentoVposFallido(
        payload.shop_process_id,
        'Rollback solicitado por el comercio',
      );
    }
    return result;
  }

  @MessagePattern({ cmd: 'vpos_get_confirmation' })
  async vposGetConfirmation(@Payload() payload: { shopProcessId: string }) {
    return await this.vposService.getSingleBuyConfirmation(payload.shopProcessId);
  }

  @MessagePattern({ cmd: 'vpos_get_local_status' })
  async vposGetLocalStatus(@Payload() payload: { shopProcessId: string }) {
    const data = await this.paymentsService.getVposIntentEstado(payload.shopProcessId);
    return { success: true, message: '', data };
  }

  @MessagePattern({ cmd: 'vpos_process_confirmation' })
  async vposProcessConfirmation(@Payload() payload: any) {
    const operation = payload?.operation;
    if (!operation?.shop_process_id) {
      this.logger.log({ event: 'vpos_confirmation_ping', payload });
      return { status: 'success' };
    }

    const tokenOk = this.vposService.verifyConfirmationToken(operation);
    if (!tokenOk) {
      this.logger.warn({ event: 'vpos_confirmation_invalid_token', shopProcessId: operation.shop_process_id });

      return { status: 'success' };
    }

    await this.paymentsQueue.enqueueVposConfirmation(operation);
    return { status: 'success' };
  }
}
