export interface RejectionCodeInfo {
  codigo: number;
  motivo: string;
  solucion: string;
  campo: string;
}

export const REJECTION_CODES: Record<number, RejectionCodeInfo> = {
  303: {
    codigo: 303,
    motivo: 'Falta de stock',
    solucion:
      'Actualizá el campo stock_actual a un valor mayor a 0 y volvé a enviar el producto.',
    campo: 'stock_actual',
  },
  304: {
    codigo: 304,
    motivo: 'Falta de imágenes',
    solucion:
      'Cargá al menos la imagen_1 con una URL pública válida (accesible sin login).',
    campo: 'imagen_1',
  },
  305: {
    codigo: 305,
    motivo: 'Marca no reconocida',
    solucion:
      'Revisá el nombre de la marca — no coincide con ninguna marca de nuestro catálogo. Corregí el nombre o escribinos si es una marca nueva.',
    campo: 'codigo_marca',
  },
  306: {
    codigo: 306,
    motivo: 'Categoría o subcategoría inválida',
    solucion:
      'La subcategoría elegida no pertenece a la categoría seleccionada. Volvé a elegir ambas desde los desplegables del Excel.',
    campo: 'codigo_categoria',
  },
  307: {
    codigo: 307,
    motivo: 'Precio por debajo del mínimo permitido',
    solucion: 'El costo debe ser igual o mayor a Gs. 9.000.',
    // "campo" referencia el nombre del campo en la entidad ProductsSeller (usado
    // por BulkCorrectionModal/bulkResubmit). El proveedor corrige su costo; el
    // precio de venta se recalcula solo con el recargo.
    campo: 'costo',
  },
  308: {
    codigo: 308,
    motivo: 'Producto duplicado',
    solucion:
      'Ya existe un producto con este código de barra o nombre muy similar. Verificá que no lo hayas subido antes.',
    campo: 'codigo_de_barra',
  },
  309: {
    codigo: 309,
    motivo: 'Información incompleta o incorrecta',
    solucion:
      'Revisá el nombre y la descripción del producto — falta información necesaria para publicarlo.',
    campo: 'nombre_articulo',
  },
};

export function getRejectionCodesList(): RejectionCodeInfo[] {
  return Object.values(REJECTION_CODES);
}
