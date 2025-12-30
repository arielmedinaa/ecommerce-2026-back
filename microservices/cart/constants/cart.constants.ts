import { Cart } from '@cart/schemas/cart.schema';

export const DEFAULT_CART: Partial<Cart> = {
  proceso: '',
  cliente: {
    equipo: '',
    razonsocial: '',
    documento: '',
    correo: '',
    telefono: '',
  },
  tiempo: new Date(),
  transaccion: [],
  seguimiento: [],
  envio: {
    direccion: '',
    numerocasa: '',
    ciudad: '',
    barrio: '',
    observacion: '',
    ubicacion: '',
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

export const NEW_CART_INITIAL_STATE = (codigo: number, clienteToken: string, cuenta: string): Partial<Cart> => ({
  ...DEFAULT_CART,
  codigo,
  cliente: {
    ...DEFAULT_CART.cliente!,
    equipo: clienteToken,
    correo: cuenta === 'undefined' ? '' : cuenta,
  },
});
