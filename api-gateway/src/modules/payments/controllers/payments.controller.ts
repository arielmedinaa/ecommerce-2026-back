import { Controller, Post, Body, UsePipes, ValidationPipe, Inject, Req, Query, Get, Param } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { Request } from 'express';
import { SneakyThrows } from '@decorators/sneaky-throws-new.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(
    @Inject('PAYMENTS_SERVICE') private readonly paymentsClient: ClientProxy,
  ) {}

  @Post('registrar')
  @UsePipes(new ValidationPipe())
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
}
