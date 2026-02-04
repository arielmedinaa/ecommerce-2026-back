import { Cart } from '@cart/schemas/cart.schema';
import moment from 'moment-timezone';

export const DEFAULT_CART: Partial<Cart> = {
  proceso: '',
  cliente: {
    equipo: '',
    razonsocial: '',
    documento: '',
    correo: '',
    telefono: '',
  },
  tiempo: moment().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
  transaccion: [],
  seguimiento: [],
  envio: {
    callePrincipal: "",
    calleSecundaria: "",
    direccion: '',
    numerocasa: '',
    ciudad: '',
    ciudadId: 1,
    barrio: '',
    observacion: '',
    ubicacion: {},
    agendamiento: moment().tz('America/Asuncion').format('YYYY-MM-DDTHH'),
    horaAgendamiento: '',
    retirar: 0
  },
  pago: {
    tipo: '',
    monto: '',
    moneda: '',
    condicion: '',
    periodicidad: '',
    entregainicial: 0,
    cantidadcuotas: '',
    cuotas: [],
  },
  articulos: {
    contado: [],
    credito: [],
  },
  atencion: 0,
  estado: 1,
  estados: {
    articulos: {
      contado: { codigo: 0, descripcion: '', detalle: '' },
      credito: { codigo: 0, descripcion: '', detalle: '' },
    },
    progreso: { codigo: 0, descripcion: '' },
  },
};

export const DEFAULT_SOLICITUD: Partial<Cart> = {
  codigo: 1,
  cliente: {
    equipo: '',
    razonsocial: '',
    documento: '',
    correo: '',
    telefono: '',
    tipodocumento: ''
  },
  tiempo: moment().tz('America/Asuncion').format('YYYY-MM-DDTHH:mm:ss.SSSZ'),
  envio: {
    callePrincipal: '',
    calleSecundaria: '',
    numerocasa: '',
    ciudad: '',
    ciudadId: 1,
    barrio: '',
    observacion: '',
    ubicacion: {
      lat: -25.31287,
      lng: -57.578178
    },
    agendamiento: '',
    horaAgendamiento: '',
    retirar: 0
  },
  pago: {
    tipo: '',
    monto: '',
    moneda: '',
    condicion: '',
    periodicidad: '',
    entregainicial: 0,
    cantidadcuotas: '',
    cuotas: []
  },
  articulos: {
    contado: [],
    credito: []
  },
  estado: 1,
  seguimiento: [],
  transaccion: []
}

export const NEW_CART_INITIAL_STATE = (codigo: number, clienteToken: string, cuenta: string): Partial<Cart> => ({
  ...DEFAULT_CART,
  codigo,
  cliente: {
    ...DEFAULT_CART.cliente!,
    equipo: clienteToken,
    correo: cuenta === 'undefined' ? '' : cuenta,
  },
});

export const NEW_SOLICITUD_INITIAL_STATE = (codigo: number, clienteToken: string, cuenta: string): Partial<Cart> => ({
  ...DEFAULT_SOLICITUD,
  codigo,
  cliente: {
    ...DEFAULT_SOLICITUD.cliente!,
    equipo: clienteToken,
    correo: cuenta === 'undefined' ? '' : cuenta,
  },
});

export const ESTADO_SOLICITUD_MAP = {
  '01': 'Solicitud en análisis de crédito',
  '02': 'Solicitud en análisis de crédito', 
  '04': 'Solicitud en análisis de crédito',
  '07': 'El pedido se está procesando',
  '10': 'El pedido se está procesando',
  '13': 'El pedido se está procesando',
  '22': 'El pedido se está procesando',
  '23': 'El pedido se está procesando',
  '05': 'El pedido se está procesando',
  '16': 'Su solicitud está lista para despacharse',
};
