import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ClaudeClientService } from '@shared/common/services/claude-client.service';
import { Product } from '@products/schemas/products/product.schemas';
import { ProductsSeller } from '../../schemas/products-seller/products-seller.schema';
import { repararMojibake } from '../../utils/text/mojibake.util';

// Nunca se escribe en articulo: erpReadRepository apunta a READ_CONNECTION
// (solo lectura). El resultado del cruce vive exclusivamente en las columnas
// erp_* de products_sellers.

export interface ResultadoMatchErp {
  status: 'match_automatico' | 'revision_manual' | 'sin_match';
  codigoArticulo: string | null;
  score: number | null;
  motivo: string | null;
}

interface CandidatoErp {
  codigo_articulo: string;
  nombre: string;
  codigodebarra: string | null;
  marca_nombre: string | null;
  familia_nombre: string | null;
}

interface VeredictoMatchIA {
  matchEncontrado: boolean;
  codigoArticulo: string | null;
  score: number;
  status: 'match_automatico' | 'revision_manual' | 'sin_match';
  motivo: string;
}

// El WHERE que define qué articulos del ERP están efectivamente visibles en
// el ecommerce hoy (mismo criterio que products.service.ts WEB_BASE_WHERE) —
// solo contra esos tiene sentido comparar, uno dado de baja no compite por
// visibilidad.
const ARTICULO_VISIBLE_WHERE = `a.baja = 0 AND (a.web = 1 OR a.websc = 1)`;

const ERP_MATCH_SYSTEM_PROMPT = `Sos un agente que evita que un mismo producto físico aparezca duplicado en
un marketplace. Te paso un producto subido por un proveedor externo (dropshipping)
y una lista de candidatos que ya existen en el catálogo interno (ERP) de la tienda.
Tu tarea es decidir si alguno de los candidatos es EL MISMO producto real, y con
qué nivel de confianza.

Reglas:
- No es necesario texto idéntico: mismo producto con distinta redacción, orden de
  palabras, abreviaturas, o specs formateadas distinto SIGUE siendo el mismo
  producto (ej. "Compresor 2HP 50L Gamma Monofásico G20107" y "COMPRESOR GAMMA
  G20107 2HP 50 LITROS MONOFASICO" son el mismo producto).
- Si el código de barra coincide exactamente, es el mismo producto sin dudarlo
  (score 100, status match_automatico), incluso si el nombre difiere bastante.
- Sé conservador: preferís no encontrar match a inventar uno. Un falso positivo
  oculta un producto real y le hace perder ventas al proveedor; eso es peor que
  dejar temporalmente un posible duplicado visible.
- Elegís vos el status según tu propia confianza, no hay un umbral numérico fijo
  que te den de afuera:
  - "match_automatico": estás muy seguro de que es el mismo producto físico
    (score orientativo 90-100).
  - "revision_manual": hay indicios razonables de que podría ser el mismo
    producto (nombre similar, misma categoría/marca) pero no estás seguro
    (score orientativo 60-89) — que lo confirme una persona.
  - "sin_match": no hay ningún candidato que parezca el mismo producto
    (score orientativo 0-59).
- Si matchEncontrado es false, codigoArticulo debe ser null y status debe ser
  "sin_match".

Respondé ÚNICAMENTE JSON con esta forma exacta:
{"matchEncontrado": boolean, "codigoArticulo": string | null, "score": number, "status": "match_automatico" | "revision_manual" | "sin_match", "motivo": string}
El campo "motivo" es una frase corta explicando la decisión (para que la lea un humano en revisión manual).`;

@Injectable()
export class ProductsSellerErpMatchService {
  private readonly logger = new Logger(ProductsSellerErpMatchService.name);

  constructor(
    private readonly claude: ClaudeClientService,
    @InjectRepository(Product, 'READ_CONNECTION')
    private readonly erpReadRepository: Repository<Product>,
    @InjectRepository(ProductsSeller, 'WRITE_ECOMMERCE_PRODUCTS_CONNECTION')
    private readonly sellerRepository: Repository<ProductsSeller>,
  ) {}

  // Evalúa (o re-evalúa) el cruce ERP de un seller y persiste el resultado en
  // products_sellers. No lanza: ante cualquier falla técnica deja/mantiene
  // 'sin_match' (nunca oculta un producto por un error del agente).
  async evaluarMatch(seller: ProductsSeller): Promise<ResultadoMatchErp> {
    try {
      const porCodigoBarra = await this.matchExactoPorCodigoBarra(seller);
      const resultado = porCodigoBarra ?? (await this.matchConIA(seller));
      await this.persistir(seller.id, resultado);
      return resultado;
    } catch (error: any) {
      this.logger.error(`No se pudo evaluar match ERP para seller #${seller.id}: ${error.message}`);
      return { status: 'sin_match', codigoArticulo: null, score: null, motivo: null };
    }
  }

  // Producto ya marcado match_automatico: si el articulo del ERP con el que
  // matcheaba deja de estar visible (dado de baja, o retirado de la web),
  // ya no tiene sentido seguir ocultando el del proveedor. Chequeo SQL barato,
  // sin volver a llamar a Claude.
  async siguevigenteMatchAutomatico(codigoArticulo: string): Promise<boolean> {
    const rows = await this.erpReadRepository.query(
      `SELECT 1 FROM articulo a WHERE a.codigo_articulo = ? AND ${ARTICULO_VISIBLE_WHERE} LIMIT 1`,
      [codigoArticulo],
    );
    return Array.isArray(rows) && rows.length > 0;
  }

  private async matchExactoPorCodigoBarra(seller: ProductsSeller): Promise<ResultadoMatchErp | null> {
    const codigoBarra = (seller.codigo_de_barra || '').trim();
    if (!codigoBarra) return null;

    const rows = await this.erpReadRepository.query(
      `SELECT a.codigo_articulo FROM articulo a
        WHERE ${ARTICULO_VISIBLE_WHERE} AND a.codigodebarra = ? LIMIT 1`,
      [codigoBarra],
    );

    if (!Array.isArray(rows) || rows.length === 0) return null;

    return {
      status: 'match_automatico',
      codigoArticulo: String(rows[0].codigo_articulo),
      score: 100,
      motivo: 'Coincidencia exacta de código de barra con un artículo del ERP.',
    };
  }

  private async obtenerCandidatos(): Promise<CandidatoErp[]> {
    const rows = await this.erpReadRepository.query(
      `SELECT a.codigo_articulo, a.nombre, a.codigodebarra,
              m.nombre AS marca_nombre, f.nombre AS familia_nombre
         FROM articulo a
         LEFT JOIN marca m ON m.codigo = a.marca
         LEFT JOIN familia f ON f.codigo = a.familia
        WHERE ${ARTICULO_VISIBLE_WHERE}`,
    );
    return Array.isArray(rows) ? rows : [];
  }

  private async matchConIA(seller: ProductsSeller): Promise<ResultadoMatchErp> {
    const todos = await this.obtenerCandidatos();
    if (todos.length === 0) {
      return { status: 'sin_match', codigoArticulo: null, score: null, motivo: null };
    }

    const candidatos = this.preseleccionarCandidatos(repararMojibake(seller.nombre_articulo), todos);
    if (candidatos.length === 0) {
      return { status: 'sin_match', codigoArticulo: null, score: null, motivo: null };
    }

    const productoProveedor = {
      nombre: repararMojibake(seller.nombre_articulo),
      descripcion: repararMojibake(seller.descripcion || '') || null,
      marca: seller.marca_sugerida || seller.marca_texto_original || null,
      codigo_de_barra: seller.codigo_de_barra || null,
    };

    const veredicto = await this.claude.askJson<VeredictoMatchIA>(
      ERP_MATCH_SYSTEM_PROMPT,
      `Producto del proveedor a evaluar:\n${JSON.stringify(productoProveedor, null, 2)}\n\n` +
        `Candidatos existentes en el ERP (catálogo interno):\n${JSON.stringify(candidatos, null, 2)}`,
    );

    if (!veredicto?.matchEncontrado || !veredicto.codigoArticulo) {
      return { status: 'sin_match', codigoArticulo: null, score: veredicto?.score ?? null, motivo: veredicto?.motivo ?? null };
    }

    const status: ResultadoMatchErp['status'] =
      veredicto.status === 'match_automatico' || veredicto.status === 'revision_manual' ? veredicto.status : 'revision_manual';

    return {
      status,
      codigoArticulo: veredicto.codigoArticulo,
      score: typeof veredicto.score === 'number' ? veredicto.score : null,
      motivo: veredicto.motivo || null,
    };
  }

  async marcarSinMatch(sellerId: number): Promise<void> {
    await this.persistir(sellerId, { status: 'sin_match', codigoArticulo: null, score: null, motivo: null });
  }

  private readonly MAX_CANDIDATOS_IA = 40;

  private preseleccionarCandidatos(nombreProveedor: string, candidatos: CandidatoErp[]): CandidatoErp[] {
    const tokensProveedor = this.tokenizar(nombreProveedor);
    if (tokensProveedor.size === 0) return candidatos.slice(0, this.MAX_CANDIDATOS_IA);

    const puntuados = candidatos
      .map((c) => ({ c, score: this.solapamiento(tokensProveedor, this.tokenizar(c.nombre)) }))
      .sort((a, b) => b.score - a.score);

    return puntuados.slice(0, this.MAX_CANDIDATOS_IA).map((p) => p.c);
  }

  private tokenizar(texto: string): Set<string> {
    return new Set(
      repararMojibake(texto || '')
        .toUpperCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .split(/[^A-Z0-9]+/)
        .filter((t) => t.length >= 3),
    );
  }

  private solapamiento(a: Set<string>, b: Set<string>): number {
    let n = 0;
    for (const t of a) if (b.has(t)) n++;
    return n;
  }

  private async persistir(sellerId: number, resultado: ResultadoMatchErp): Promise<void> {
    await this.sellerRepository.update(
      { id: sellerId },
      {
        erp_articulo_match: resultado.codigoArticulo,
        erp_match_score: resultado.score,
        erp_match_status: resultado.status,
        erp_match_motivo: resultado.motivo,
        erp_match_evaluado_at: new Date(),
      },
    );
  }
}
