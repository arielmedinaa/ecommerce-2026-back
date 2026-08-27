export type CardTipo = 'metrica' | 'filtro';

export interface CardDefinicion {
  key: string;
  tipo: CardTipo;
  nombre: string;
  descripcion: string;
  columnaFecha?: string;
  filtrosCompatibles?: string[];
}

export const CARD_CATALOG: CardDefinicion[] = [
  {
    key: 'venta',
    tipo: 'metrica',
    nombre: 'Ventas',
    descripcion: 'Total facturado de la empresa (ventacab)',
    columnaFecha: 'fecha',
    filtrosCompatibles: ['fecha'],
  },
  {
    key: 'a_facturar',
    tipo: 'metrica',
    nombre: 'Aprobado / Imprimido (a facturar)',
    descripcion: 'Solicitudes pendientes de facturar (estado_soli = 16)',
    columnaFecha: 'age_frecepcion',
    filtrosCompatibles: ['fecha', 'cliente', 'promocion'],
  },
  {
    key: 'facturado_ecommerce',
    tipo: 'metrica',
    nombre: 'Facturado Ecommerce',
    descripcion: 'Facturado por el canal ecommerce (estado_soli 16/19)',
    columnaFecha: 'fecha',
    filtrosCompatibles: ['fecha', 'cliente', 'promocion', 'estado'],
  },
  {
    key: 'carritos_abandonados',
    tipo: 'metrica',
    nombre: 'Carritos Abandonados',
    descripcion: 'Carritos sin finalizar y con más de 20 minutos de inactividad',
    columnaFecha: 'createdAt',
    filtrosCompatibles: ['fecha'],
  },
  {
    key: 'productos_top_vendidos',
    tipo: 'metrica',
    nombre: 'Productos Más Vendidos',
    descripcion: 'Top de productos por unidades vendidas en órdenes confirmadas',
    columnaFecha: 'fecha_creacion',
    filtrosCompatibles: ['fecha'],
  },
  {
    key: 'fecha',
    tipo: 'filtro',
    nombre: 'Fecha',
    descripcion: 'Rango de fechas (desde/hasta)',
  },
  {
    key: 'cliente',
    tipo: 'filtro',
    nombre: 'Cliente',
    descripcion: 'Filtrar por código de cliente',
  },
  {
    key: 'promocion',
    tipo: 'filtro',
    nombre: 'Promoción',
    descripcion: 'Filtrar por id de promoción/campaña',
  },
  {
    key: 'estado',
    tipo: 'filtro',
    nombre: 'Estado',
    descripcion: 'Filtrar por estado de la solicitud',
  },
];
