import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
  Inject,
  Req,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import { SneakyThrows } from '@decorators/sneaky-throws-new.decorator';
import { JwtAuthGuard } from '@gateway/common/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject('PAYMENTS_SERVICE') private readonly paymentsClient: ClientProxy,
  ) {}

  @Post('registrar')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'registrarPago')
  async registrarPago(@Body() body: any, @Req() request: Request) {
    const payload = {
      codigoCarrito: body.codigoCarrito,
      carrito: body.carrito,
      metodoPago: body.metodoPago,
      monto: body.monto,
      moneda: body.moneda || 'PYG',
      cliente: body.cliente,
      descripcion: body.descripcion,
      respuestaPagopar: body.respuestaPagopar,
      respuestaBancard: body.respuestaBancard,
    };

    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'registrar_pago' }, payload),
    );

    return result;
  }

  @Get('listar/:codigoCarrito')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'listarPagosPorCarrito')
  async listarPagosPorCarrito(@Param('codigoCarrito') codigoCarrito: string) {
    const payload = {
      codigoCarrito: Number(codigoCarrito),
    };

    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'listar_pagos_carrito' }, payload),
    );

    return result;
  }

  @Get('reembolsos/:codigoCarrito')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'obtenerReembolsos')
  async obtenerReembolsos(@Param('codigoCarrito') codigoCarrito: string) {
    const payload = {
      codigoCarrito: Number(codigoCarrito),
    };

    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'obtener_reembolsos' }, payload),
    );

    return result;
  }

  @Get('motivoRechazo/:codigoCarrito')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'verMotivoRechazo')
  async verMotivoRechazo(@Param('codigoCarrito') codigoCarrito: string) {
    const payload = {
      codigoCarrito: Number(codigoCarrito),
    };

    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'ver_motivo_rechazo' }, payload),
    );

    return result;
  }

  @Post('actualizarEstado')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'actualizarEstadoPago')
  async actualizarEstadoPago(@Body() body: any, @Req() request: Request) {
    const payload = {
      idTransaccion: body.idTransaccion,
      estado: body.estado,
      respuestaPagopar: body.respuestaPagopar,
      respuestaBancard: body.respuestaBancard,
      motivoFallo: body.motivoFallo,
    };

    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'actualizar_estado_pago' }, payload),
    );

    return result;
  }

  @Get('health')
  @UsePipes(new ValidationPipe())
  @SneakyThrows('PaymentsService', 'healthCheck')
  async healthCheck() {
    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'health_check' }, {}),
    );

    return result;
  }

  @Post('vpos/single-buy')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'vposSingleBuy')
  async vposSingleBuy(@Body() body: any) {
    const payload = {
      codigoCarrito: body.codigoCarrito,
      carrito: body.carrito,
      monto: body.monto,
      moneda: body.moneda || 'PYG',
      cliente: body.cliente,
      descripcion: body.descripcion,
      zimple: body.zimple,
      return_url: body.return_url,
      cancel_url: body.cancel_url,
      additional_data: body.additional_data,
    };

    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'vpos_single_buy' }, payload),
    );
    return result;
  }

  @Post('vpos/rollback')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'vposRollback')
  async vposRollback(@Body() body: any) {
    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'vpos_rollback' }, body),
    );
    return result;
  }

  @Get('vpos/confirmation/:shopProcessId')
  @UsePipes(new ValidationPipe())
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'vposGetConfirmation')
  async vposGetConfirmation(@Param('shopProcessId') shopProcessId: string) {
    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'vpos_get_confirmation' }, { shopProcessId }),
    );
    return result;
  }

  @Get('vpos/status/:shopProcessId')
  @UseGuards(JwtAuthGuard)
  @SneakyThrows('PaymentsService', 'vposGetLocalStatus')
  async vposGetLocalStatus(@Param('shopProcessId') shopProcessId: string) {
    const result = await firstValueFrom(
      this.paymentsClient.send({ cmd: 'vpos_get_local_status' }, { shopProcessId }),
    );
    return result;
  }

  @Post('vpos/confirmation')
  async vposProcessConfirmation(@Body() body: any) {
    try {
      await firstValueFrom(
        this.paymentsClient.send({ cmd: 'vpos_process_confirmation' }, body || {}),
      );
    } catch (error) {
      console.error('Error procesando confirmación VPOS', error?.message || error);
    }
    return { status: 'success' };
  }
}
