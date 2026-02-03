import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentsDocument = Payments & Document;

@Schema({
  timestamps: true,
  collection: 'transacciones',
})
export class Payments {
  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
  @Prop({ type: Number, required: true })
  codigoCarrito: number;

  @Prop({ type: Object, required: true })
  carrito: Record<string, any>;

  @Prop({
    type: String,
    required: true,
    enum: [
      'pendiente',
      'procesando',
      'completado',
      'fallido',
      'cancelado',
      'reembolsado',
    ],
  })
  estado: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'pagopar',
      'bancard',
      'efectivo contra entrega',
      'tarjeta contra entrega',
    ],
  })
  metodoPago: string;

  @Prop({ type: Number, required: true })
  monto: number;

  @Prop({ type: String, required: true })
  moneda: string;

  @Prop({ type: Object, default: {} })
  respuestaPagopar: {
    idPago?: string;
    estado?: string;
    urlProceso?: string;
    codigoQr?: string;
    fechaExpiracion?: string;
    respuesta?: any;
  };

  @Prop({ type: Object, default: {} })
  respuestaBancard: {
    idPago?: string;
    estado?: string;
    codigoAutorizacion?: string;
    numeroTicket?: string;
    respuesta?: any;
  };

  @Prop({ type: String })
  idTransaccion: string;

  @Prop({ type: String })
  descripcion: string;

  @Prop({ type: Object, default: {} })
  cliente: {
    nombre?: string;
    email?: string;
    telefono?: string;
    documento?: string;
  };

  @Prop({ type: Object, default: {} })
  metadatos: Record<string, any>;

  @Prop({ type: Date })
  finalizado: Date;

  @Prop({ type: String })
  motivoFallo: string;

  @Prop({ type: Number, default: 0 })
  intentosReintentar: number;

  @Prop({ type: Date })
  proximoReintento: Date;

  @Prop({ type: Object, default: {} })
  reembolsos: Array<{
    monto: number;
    motivo: string;
    fecha: Date;
    estado: string;
    idReembolso?: string;
  }>;

  @Prop({ type: Date })
  procesado: Date;

  @Prop({ type: Date })
  expira: Date;
}

export const PaymentsSchema = SchemaFactory.createForClass(Payments);
