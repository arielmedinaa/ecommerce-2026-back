import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import * as path from 'path';
import { ImageStorageService } from '@shared/common/services/image-storage.service';
import { SellerImageValidatorUtil } from '@products/utils/seller-image-validator.util';
import { ProductsSellerEtlPayload } from '../types';

export interface CorridaReporte {
  productosProcesados: number;
  productosCreados: number;
  productosActualizados: number;
  productosRechazados: number;
  motivosRechazo: Record<string, number>;
  errores: string[];
}

// Harness genérico, escrito y revisado por nosotros (NO generado por Claude):
// carga el `extractor`/`mapper` que Claude generó para un proveedor y les
// aplica, de forma determinística, los 3 criterios pedidos:
//   1) sin duplicados dentro del propio lote,
//   2) ninguna fila sin imagen válida,
//   3) sin duplicados en products_sellers (vía upsert, nunca insert ciego).
// Así, la garantía de no-duplicado/no-falta-imagen no depende de que el
// código generado por el modelo "diga la verdad" — la aplica siempre este
// código fijo.
@Injectable()
export class ProviderRunnerService {
  private readonly logger = new Logger(ProviderRunnerService.name);

  constructor(
    @Inject('PRODUCTS_SERVICE') private readonly productsClient: ClientProxy,
    private readonly imageStorage: ImageStorageService,
    private readonly imageValidator: SellerImageValidatorUtil,
  ) {}

  private loadProviderModule(slug: string): {
    extraerLote: (cursor: string | null) => Promise<{ items: any[]; nextCursor: string | null }>;
    mapearProducto: (raw: any) => { payload: Omit<ProductsSellerEtlPayload, 'imagen_1'>; imagenUrl: string | null } | null;
  } {
    // Requiere ts-node/register (transpile-only) ya inicializado en main.ts,
    // así los .ts generados en runtime se pueden importar sin build previo.
    const extractorPath = path.join(__dirname, '..', 'providers', slug, 'extractor.ts');
    const mapperPath = path.join(__dirname, '..', 'providers', slug, 'mapper.ts');
    delete require.cache[require.resolve(extractorPath)];
    delete require.cache[require.resolve(mapperPath)];
    const extractor = require(extractorPath);
    const mapper = require(mapperPath);
    return { extraerLote: extractor.extraerLote, mapearProducto: mapper.mapearProducto };
  }

  async runOneLote(idProveedor: number, slug: string, creadoPor: string, cursor: string | null = null): Promise<CorridaReporte & { nextCursor: string | null }> {
    const reporte: CorridaReporte = {
      productosProcesados: 0,
      productosCreados: 0,
      productosActualizados: 0,
      productosRechazados: 0,
      motivosRechazo: {},
      errores: [],
    };

    const rechazar = (motivo: string) => {
      reporte.productosRechazados++;
      reporte.motivosRechazo[motivo] = (reporte.motivosRechazo[motivo] || 0) + 1;
    };

    const { extraerLote, mapearProducto } = this.loadProviderModule(slug);

    const { items, nextCursor } = await extraerLote(cursor);

    // Criterio 1: sin duplicados dentro del propio lote — por identificador
    // único del proveedor (interno o de barras).
    const vistos = new Set<string>();
    const loteSinDuplicados = items.filter((raw) => {
      const clave = this.claveDedupe(raw);
      if (!clave) return true; // se evalúa igual más abajo (mapper puede rechazarlo)
      if (vistos.has(clave)) {
        rechazar('duplicado_en_lote');
        return false;
      }
      vistos.add(clave);
      return true;
    });

    for (const raw of loteSinDuplicados) {
      reporte.productosProcesados++;
      let mapeado;
      try {
        mapeado = mapearProducto(raw);
      } catch (error: any) {
        rechazar(`error_mapeo: ${error.message}`);
        continue;
      }
      if (!mapeado) {
        rechazar('mapper_descarto_la_fila');
        continue;
      }

      // Criterio 2: nunca insertar sin imagen válida.
      if (!mapeado.imagenUrl) {
        rechazar('sin_imagen');
        continue;
      }
      const codigoTentativo = mapeado.payload.codigo_proveedor_interno || mapeado.payload.codigo_de_barra || `tmp-${Date.now()}`;
      const imagenResult = await this.imageValidator.validateAndUploadFromUrl(
        mapeado.imagenUrl,
        idProveedor,
        codigoTentativo,
        'imagen_1',
      );
      if (!imagenResult.success || !imagenResult.url) {
        rechazar(`imagen_invalida: ${imagenResult.message}`);
        continue;
      }

      // Criterio 3: nunca insert ciego — siempre upsert por
      // (id_proveedor, codigo_proveedor_interno/codigo_de_barra).
      try {
        const result: any = await firstValueFrom(
          this.productsClient.send(
            { cmd: 'etl_upsert_product_seller' },
            {
              idProveedor,
              payload: { ...mapeado.payload, imagen_1: imagenResult.url },
              creadoPor,
            },
          ),
        );
        if (!result?.success) {
          rechazar(`upsert_fallo: ${result?.message || 'desconocido'}`);
          continue;
        }
        if (result.created) reporte.productosCreados++;
        else reporte.productosActualizados++;
      } catch (error: any) {
        rechazar(`upsert_error: ${error.message}`);
      }
    }

    return { ...reporte, nextCursor };
  }

  private claveDedupe(raw: any): string | null {
    const codigo = raw?.codigo_proveedor_interno || raw?.sku || raw?.codigoInterno || raw?.id;
    const barra = raw?.codigo_de_barra || raw?.ean || raw?.barcode;
    if (codigo) return `interno:${codigo}`;
    if (barra) return `barra:${barra}`;
    return null;
  }
}
