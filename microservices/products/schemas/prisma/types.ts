// Types para Prisma MariaDB - Productos Service

export interface Product {
  id: number;
  codigo?: string;
  codigoBarra?: string;
  marca?: any;
  modelo?: string;
  nombre: string;
  ruta?: string;
  descripcion?: string;
  venta?: number;
  ventaCredito?: any;
  costo?: number;
  precio: number;
  cantidad: number;
  descuento: number;
  categorias?: any;
  subcategorias?: any;
  caracteristicas?: any;
  clasificaciones?: any;
  relaciones?: any;
  ofertas?: any;
  promos?: any;
  proveedores?: any;
  imagenes?: any;
  sello?: string;
  dias_ultimo_movimiento: number;
  web: number;
  websc: number;
  prioridad: number;
  orden: number;
  tipo: number;
  estado: number;
  deposito?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Combo {
  id: number;
  codigo?: string;
  codigoBarra?: string;
  marca?: any;
  modelo?: string;
  nombre: string;
  ruta: string;
  descripcion: string;
  venta?: number;
  ventaCredito?: any;
  costo?: number;
  precio: number;
  cantidad: number;
  descuento: number;
  categorias?: any;
  subcategorias?: any;
  caracteristicas?: any;
  clasificaciones?: any;
  relaciones?: any;
  ofertas?: any;
  promos?: any;
  proveedores?: any;
  imagenes?: any;
  sello?: string;
  dias_ultimo_movimiento: number;
  web: number;
  websc: number;
  prioridad: number;
  orden: number;
  tipo: number;
  estado: number;
  deposito: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: number;
  nombre: string;
  ruta: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Oferta {
  id: number;
  tiempoActivo: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
  productos: ProductoOferta[];
}

export interface ProductoOferta {
  id: number;
  nombre: string;
  codigo: string;
  tiempoActivo?: number;
  descuento?: number;
  precioContado: number;
  precioCredito: number;
  cuotas?: any;
  activo: boolean;
  prioridad: number;
  ofertaId?: number;
}

export interface Promo {
  id: number;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  ruta?: string;
  fecha?: string;
  hora?: string;
  tiempo?: any;
  contenido?: any;
  visibilidad?: any;
  configuracion?: any;
  estado?: any;
  cantidadCliente: number;
  createdAt: Date;
  updatedAt: Date;
}
