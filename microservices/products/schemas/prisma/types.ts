// Types para Prisma MariaDB - Productos Service (actualizado para producción)

export interface Product {
  id: number;
  codigo?: string;
  codigo_articulo?: string;
  nombre: string;
  familia?: string;
  subfamilia?: string;
  unidad?: string;
  proveedor?: string;
  preciocosto?: number;
  precioventa?: number;
  impuesto?: number;
  minimo?: number;
  maximo?: number;
  nota?: string;
  baja?: boolean;
  foto?: string;
  balanza?: boolean;
  nombret?: string;
  recargo?: number;
  actualiza?: boolean;
  may_can?: number;
  may_por?: number;
  act1?: string;
  act2?: string;
  act3?: string;
  act4?: string;
  act5?: string;
  ctacompra?: string;
  ctaventa?: string;
  ctacosven?: string;
  insumo?: boolean;
  costofinal?: number;
  preciotope?: number;
  recargosug?: number;
  activo?: boolean;
  oferta_desde?: Date;
  oferta_hasta?: Date;
  oferta_porce?: number;
  cambioprecio?: boolean;
  tipo_producto?: string;
  ctaimporta?: string;
  medidor?: boolean;
  moneda1?: number;
  moneda2?: number;
  codigodebarra?: string;
  marca?: string;
  web?: boolean;
  websc?: boolean;
  desmax?: number;
  stock?: number;
  stock2?: number;
  peso?: number;
  largo?: number;
  ancho?: number;
  alto?: number;
  volumen?: number;
  gestion?: string;
  valoracion?: number;
  codigo_articulo_proveedor?: string;
  numero_serie?: string;
  created_by?: string;
  created_at: Date;
  updated_by?: string;
  updated_at: Date;
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
  descripcion?: string;
  estado?: string;
  codigo_promo?: number;
  nombre_promo?: string;
  fecha_inicio?: Date;
  fecha_fin?: Date;
  fecha_fin2?: Date;
  fecha_inicio2?: Date;
  created_at: Date;
  updated_at: Date;
}
