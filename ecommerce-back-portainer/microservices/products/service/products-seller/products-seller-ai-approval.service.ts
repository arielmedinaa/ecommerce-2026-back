import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ClaudeClientService } from '@shared/common/services/claude-client.service';
import { ProductsSeller } from '../../schemas/products-seller/products-seller.schema';
import { REJECTION_CODES } from '../../constants/rejection-codes';
import { ProductsSellersService } from './products-sellers.service';

interface VeredictoIA {
  aprobado: boolean;
  codigoRechazo: number | null;
  motivo: string | null;
}

const CODIGOS_RECHAZO_VALIDOS = Object.keys(REJECTION_CODES).map(Number);

const CODIGO_RECHAZO_FALLBACK = 309; // "Información incompleta o incorrecta"

const AI_APPROVAL_SYSTEM_PROMPT = `Sos un agente de moderación de catálogo para un marketplace. Tu única tarea es
decidir si un producto cargado por un proveedor debe ser APROBADO o RECHAZADO
para publicarse. Nunca dejes el producto en un estado intermedio: siempre
debés elegir aprobado=true o aprobado=false. Si tenés dudas razonables sobre
la calidad o validez de los datos, RECHAZÁ (no asumas nada a favor del
proveedor).

Evaluás solo texto: nombre, descripción, marca, categoría/subcategoría,
precio y stock, y la presencia de URLs de imágenes (no podés ver el
contenido de las imágenes, solo si existen).

Criterios de aprobación:
- Nombre y descripción coherentes, específicos y no vacíos/genéricos.
- Marca resuelta contra catálogo (codigo_marca no nulo) o, si no resuelta,
  marca_sugerida razonable y no marcada como sospechosa.
- Categoría y subcategoría coherentes entre sí y con el producto.
- Costo declarado por el proveedor (costo) y stock_actual son valores
  plausibles (no cero, no absurdos). El campo precioventa NO lo elige el
  proveedor: lo calculamos nosotros como costo * (1 + recargo/100), así que
  no lo juzgues como si fuera una decisión suya — sirve solo de contexto.
- Al menos imagen_1 presente.

Si el producto no cumple, elegí el código de rechazo MÁS ESPECÍFICO de esta
lista (no inventes otros códigos ni texto libre suelto como motivo principal,
podés agregar una nota breve adicional en el campo "motivo"):

303 Falta de stock — stock_actual es 0 o inválido.
304 Falta de imágenes — no hay imagen_1 válida.
305 Marca no reconocida — la marca no coincide con ninguna del catálogo y no
    hay marca_sugerida creíble.
306 Categoría o subcategoría inválida — subcategoría no pertenece a la
    categoría, o ambas ausentes/incoherentes.
307 Precio por debajo del mínimo permitido — el costo declarado parece
    anormalmente bajo o inválido (el mínimo aceptado es Gs. 9.000).
308 Producto duplicado — indicios de que ya existe (no evaluable solo con
    este payload salvo que el texto lo sugiera).
309 Información incompleta o incorrecta — nombre/descripción vacíos,
    genéricos, o datos contradictorios; usalo como comodín cuando ninguno
    de los anteriores aplique pero igual no confiás en el producto.

IMPORTANTE: si aprobado=true, codigo_marca y codigo_categoria deben venir
resueltos (no nulos) en el payload — si alguno viene nulo, no puede
aprobarse: rechazá con 305 (si falta marca) o 306 (si falta categoría).

Respondé ÚNICAMENTE JSON con esta forma exacta:
{"aprobado": boolean, "codigoRechazo": number | null, "motivo": string | null}
Si aprobado es true, codigoRechazo y motivo deben ser null.
Si aprobado es false, codigoRechazo debe ser uno de: 303,304,305,306,307,308,309.`;

@Injectable()
export class ProductsSellerAiApprovalService {
  private readonly logger = new Logger(ProductsSellerAiApprovalService.name);

  constructor(
    private readonly claude: ClaudeClientService,
    @Inject(forwardRef(() => ProductsSellersService))
    private readonly productsSellersService: ProductsSellersService,
  ) {}

  // Evalúa un ProductsSeller recién guardado/actualizado y aplica el
  // veredicto de inmediato (aprobado/rechazado), reusando approve()/reject()
  // ya existentes — mismas notificaciones, mismo estado. Nunca deja el
  // producto en 'pendiente': ante cualquier falla técnica de la IA, rechaza
  // por seguridad con el código de fallback.
  async evaluarYAplicar(seller: ProductsSeller, modificadoPor: string): Promise<void> {
    const veredicto = await this.evaluar(seller);

    try {
      if (veredicto.aprobado) {
        const result = await this.productsSellersService.approve(seller.id, modificadoPor, {});
        if (!result.success) {
          // No se pudo aprobar (ej. marca/categoría igual no resueltas pese
          // a lo que dijo la IA) — se rechaza para no dejarlo colgado.
          this.logger.warn(`IA aprobó seller #${seller.id} pero approve() falló ("${result.message}"); se rechaza por seguridad.`);
          await this.productsSellersService.reject(
            seller.id,
            !seller.codigo_marca ? 305 : 306,
            `No se pudo aprobar automáticamente: ${result.message}`,
            modificadoPor,
          );
        }
      } else {
        await this.productsSellersService.reject(
          seller.id,
          veredicto.codigoRechazo ?? CODIGO_RECHAZO_FALLBACK,
          veredicto.motivo ?? undefined,
          modificadoPor,
        );
      }
    } catch (error: any) {
      this.logger.error(`Error aplicando veredicto de IA para seller #${seller.id}: ${error.message}`);
    }
  }

  private async evaluar(seller: ProductsSeller): Promise<VeredictoIA> {
    const payload = {
      nombre_articulo: seller.nombre_articulo,
      descripcion: seller.descripcion || null,
      marca_texto_original: seller.marca_texto_original || null,
      codigo_marca: seller.codigo_marca || null,
      marca_sugerida: seller.marca_sugerida || null,
      requiere_revision_marca: !!seller.requiere_revision_marca,
      codigo_categoria: seller.codigo_categoria || null,
      codigo_subcategoria: seller.codigo_subcategoria || null,
      requiere_revision_categoria: !!seller.requiere_revision_categoria,
      costo: seller.costo === null || seller.costo === undefined ? null : Number(seller.costo),
      precioventa_calculado: Number(seller.precioventa),
      stock_actual: Number(seller.stock_actual),
      tiene_imagen_1: !!seller.imagen_1,
      tiene_imagen_2: !!seller.imagen_2,
      tiene_imagen_3: !!seller.imagen_3,
      tiene_imagen_4: !!seller.imagen_4,
      tiene_imagen_5: !!seller.imagen_5,
    };

    try {
      const raw = await this.claude.askJson<VeredictoIA>(
        AI_APPROVAL_SYSTEM_PROMPT,
        `Evaluá este producto y devolvé tu veredicto:\n${JSON.stringify(payload, null, 2)}`,
      );

      if (raw?.aprobado === true) {
        return { aprobado: true, codigoRechazo: null, motivo: null };
      }

      const codigoRechazo = CODIGOS_RECHAZO_VALIDOS.includes(Number(raw?.codigoRechazo))
        ? Number(raw.codigoRechazo)
        : CODIGO_RECHAZO_FALLBACK;

      return { aprobado: false, codigoRechazo, motivo: raw?.motivo || null };
    } catch (error: any) {
      this.logger.error(`Falló la evaluación de IA para seller #${seller.id}: ${error.message}. Se rechaza por seguridad.`);
      return {
        aprobado: false,
        codigoRechazo: CODIGO_RECHAZO_FALLBACK,
        motivo: 'No se pudo evaluar automáticamente (error técnico del agente de IA); se rechaza por seguridad, reintentar reenviando el producto.',
      };
    }
  }
}
