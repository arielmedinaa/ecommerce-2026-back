Ready for review
Select text to add comments on the plan
Sinónimos y búsqueda "inteligente" para /api/products
Contexto
El usuario reportó que buscar "parlante" y buscar "speaker" (mismo concepto) devuelve conjuntos de resultados casi disjuntos. Se investigó de punta a punta:

1. Base de datos ERP (ssss_emp1 en 192.168.100.100), procedure proc_obtener_articulos_ecommerce_web:

Conexión: mysql --skip-ssl -h 192.168.100.100 -P 3306 -u root -pclassicS ssss_emp1 (el cliente es MariaDB y el server no soporta el TLS que exige por defecto; hace falta --skip-ssl).
El procedure tokeniza p_busqueda (máx. 4 tokens, separados por espacio) y exige que todos los tokens aparezcan como substring (LIKE '%tok%') en a.nombre (AND, no OR).
Solo si la búsqueda con matching exacto devuelve 0 filas en offset=0, cae a un fallback fuzzy: reconstruye candidatos, parte nombre en palabras, y para cada token de ≥3 caracteres descarta productos cuya palabra más cercana no cumpla misma primera letra + |diff largo|≤2 + levenshtein ≤ 1-2. Esto solo tolera errores de tipeo (typos) de bajo edit-distance, nunca sinónimos semánticos ("parlante" vs "speaker" tienen distancia de edición altísima, nunca entra ahí), y ni siquiera cubre typos de marcas largas (p. ej. "gudwater" vs "goodweather": 11 vs 8 caracteres, diff=3 > 2, nunca dispara el fallback).
Performance real medida: CALL proc_obtener_articulos_ecommerce_web(50,0,NULL,NULL,NULL,NULL,NULL,1,'parlante') → ~0.32s; con 'speaker' → ~0.17s. Ambas rápidas individualmente.
Confirmado el bug reportado: "parlante" devuelve 18 filas, "speaker" devuelve 8 filas, y solo 1 producto aparece en ambos listados (el que tiene las dos palabras en el nombre).
Taxonomía real del catálogo (para diseñar sinónimos con datos reales, no adivinando):
25 categorías (familia): CELULARES Y SMARTWATCHES, TELEVISORES Y AUDIO, TECNOLOGÍA Y GAMING, CLIMATIZACIÓN, COCINAS Y ANAFES, REFRIGERACIÓN, PEQUEÑOS ELECTRODOMESTICOS, MUEBLES, BEBÉS Y NIÑOS, BAZAR, LAVADO Y LIMPIEZA, SALUD Y BELLEZA, INDUMENTARIA (DEPORTIVA), etc.
371 marcas, incluyendo GOODWEATHER (código 28) tal cual el usuario mencionó.
Ya existe una subfamilia CAMA/BASE/COLCHON (código 43) que agrupa camas y colchones — pero una búsqueda de texto libre "colchon" no trae las "camas" que no contienen la palabra "colchon" en el nombre, que es justo lo que pide el usuario.
La procedure vive solo en la base de datos (no hay migración en el repo ecommerce-2026-back que la defina), así que el plan no la modifica — es demasiado riesgoso tocar un procedure de producción del ERP sin pasar por el equipo dueño de esa base. Todo el trabajo se hace en la capa de aplicación (Node/NestJS), que sí está versionada.
2. Servicio de búsqueda (ecommerce-2026-back):

Flujo real: POST /api/products (api-gateway products.controller.ts:607) → NATS get_products (microservices/products/controller/products.controller.ts:247) → ProductsService.findAll → getCachedPrismaProductos/fetchAndCachePrismaProductos (products.service.ts:227-268) → CALL proc_obtener_articulos_ecommerce_web(...) con f.busqueda construido por productsUtils.buildProcFilters (utils-products.ts:120-140), que solo aplica normBusqueda (trim + un singularizador ingenuo por token). No hay expansión de sinónimos, ni normalización de acentos, en el camino real de búsqueda.
Hallazgo clave: utils-products.ts ya contiene SEARCH_SYNONYMS, BRAND_VARIATIONS, processIntelligentSearch, expandSearchTerms, detectBrand, detectCategory, calculateSimilarity/levenshteinDistance — pero es código muerto: no lo llama nada del flujo real (findAll, fetchAndCachePrismaProductos, contarProductos, getSuggestions). Alguien empezó esta función y nunca la conectó.
El conteo total para paginación (contarProductos / ProductsUtils.contarProductosV2, usados para el total que ve el frontend) usa una query manual con LIKE CONCAT('%', REPLACE(?, ' ', '%'), '%') — debe actualizarse en paralelo a la lógica de búsqueda o la paginación quedará inconsistente con los resultados reales.
Sí existe una función de similitud correcta y con normalización de acentos — normalizarNombre/similitudNombres en microservices/products/utils/similitud-nombres.ts (NFD strip de acentos, lowercase, bigramas + Dice coefficient) — pero solo se usa para matchear productos de proveedores contra el catálogo (products-sellers.service.ts:579), no en la búsqueda de clientes.
En el frontend (app-ecommerce-2026 y admin-proveedor-ecommerce/frontend) el parámetro que se envía es search (body de POST /products), con debounce de 350ms/500ms respectivamente; ninguno de los dos hace lowercase/strip de acentos antes de enviar. El admin frontend además tiene otro diccionario de sinónimos igual de muerto (admin-proveedor-ecommerce/frontend/src/modules/products/const/searchPipelineProducts.js), no importado por nadie.
No hay UI de administración de sinónimos en ningún lado.
Diseño de la solución
Todo el cambio va en ecommerce-2026-back (microservicio products), reactivando y ampliando enormemente lo que ya existe en utils-products.ts, en vez de reescribir desde cero.

1. Ampliar los diccionarios (en utils-products.ts, reemplazando SEARCH_SYNONYMS/BRAND_VARIATIONS)
Tres estructuras, con datos derivados de la taxonomía real (familia/subfamilia/marca) consultada en el ERP:

CATEGORY_SYNONYMS: por cada categoría/subcategoría real del catálogo, lista amplia de sinónimos ES/EN/coloquiales (ampliar lo ya existente: televisores, smartphones, laptops, tablets, auriculares, consolas, gaming, smartwatches, cameras, audio → agregar climatizacion (aire acondicionado/split/ac/acondicionado), refrigeracion (heladera/nevera/ fridge/freezer), cocinas (cocina/anafe/horno/estufa), electrodomesticos_pequeños (licuadora/batidora/tostadora/microondas), muebles/camas_colchones (cama/colchon/sommier/ base/box/matrimonial/una plaza/dos plazas/queen/king), bazar, lavado_limpieza (lavarropas/lavadora/secarropas/aspiradora), salud_belleza, indumentaria, etc.
RELATED_CATEGORY_TERMS (nuevo): pares de categorías/subcategorías que deben mezclarse aunque no compartan palabra literal — el caso concreto del usuario: colchon ⇄ cama (ambas ya viven en la subfamilia real CAMA/BASE/COLCHON, así que el mapeo es 1:1 con datos reales, no inventado), parlante/speaker/bocina/altavoz (ya cubierto por ampliar audio), heladera/refrigerador/freezer.
BRAND_VARIATIONS: ampliar con errores de tipeo reales por marca relevante del catálogo (371 marcas — no se listan todas a mano; se genera automáticamente una entrada por marca con variantes comunes: sin espacios, con guion, con vocal repetida/omitida) más los casos puntuales que dio el usuario: goodweather → ['goodweather','good weather','gudwater', 'goodweater','gud weather','good weater'] (la marca real en el ERP es GOODWEATHER, código 28).
PHRASE_INTENTS (nuevo): mapeo de frases naturales completas a {categoria/subcategoria, keywords} para las búsquedas "detalladas" que menciona el usuario, ej. "cama para dos personas" / "cama matrimonial" → subfamilia CAMA/BASE/COLCHON + keyword matrimonial|190| 160|2 plazas; "cama para una persona" → keyword 1 plaza|90|juvenil. Se arranca con un set chico y curado (5-10 frases) enfocado en los ejemplos reales del usuario; queda documentado como el lugar donde agregar más a futuro.
2. Activar la expansión en el camino real de búsqueda
Nueva función pura en utils-products.ts (reemplaza el processIntelligentSearch muerto), p. ej. expandBusquedaTerms(rawQuery: string): { terms: string[]; categoriaHint?: string }:

Normaliza con normalizarNombre (reusar el de similitud-nombres.ts, moverlo/exportarlo si hace falta) → variante sin acentos/lowercase. Esta variante se agrega siempre, sin depender de ningún diccionario curado, porque cubre automáticamente cualquier palabra que el usuario tipeé sin tilde contra nombres de producto que sí la llevan en la BD.
Busca la query (y su variante normalizada) en CATEGORY_SYNONYMS + RELATED_CATEGORY_TERMS → si matchea, agrega como término alterno cada sinónimo/relacionado del mismo grupo.
Busca coincidencia de marca en BRAND_VARIATIONS (por token) → si el token escrito es una variante conocida, lo reemplaza por el nombre canónico de marca como término alterno.
Chequea PHRASE_INTENTS por coincidencia de frase completa (o gran solapamiento de tokens).
Devuelve máximo 4 términos totales (original + hasta 3 variantes), para acotar costo.
3. Ejecutar y mezclar en products.service.ts
En fetchAndCachePrismaProductos (y el equivalente en getCatalogoV2): si expandBusquedaTerms devuelve más de un término, ejecutar el CALL proc_obtener_articulos_ecommerce_web(...) en paralelo (Promise.all, acotado a 4 llamadas) una vez por término, en vez de una sola vez con el término crudo. Mezclar resultados por codigo_articulo (dedupe conservando el orden de aparición del primer término que lo trajo — el orden de cada lista ya viene rankeado por el procedure), y truncar a limit. Esto no requiere tocar el procedure ni sus reglas de negocio (tiers, stock, score de proveedor) — cada llamada individual ya aplica esas reglas, solo se combinan resultados. Reusar el cache existente (CACHE_TTL 5 min) con clave que incluya el conjunto de términos expandido, para que búsquedas repetidas no paguen el costo de las llamadas extra.

Actualizar en paralelo contarProductos/ProductsUtils.contarProductosV2 para que el total de paginación sea consistente con el mismo conjunto de términos expandido (OR de los LIKE en vez de uno solo).

4. Verificación
Reproducir el caso reportado contra el nuevo código: confirmar que buscar "parlante" y buscar "speaker" devuelven ahora el mismo conjunto combinado (o al menos con intersección alta).
Casos adicionales a probar explícitamente (los que dio el usuario):
"colchon" debe incluir productos "cama"/"base"/"sommier" de la subfamilia CAMA/BASE/COLCHON aunque no digan "colchon" en el nombre.
"cama para dos personas" debe resolver a productos matrimoniales/queen/king de esa misma subfamilia.
"goodweater" / "gudwater" deben resolver a la marca real GOODWEATHER.
Medir tiempo total con 3-4 llamadas paralelas al procedure (usar el mismo mysql CLI o un script Node) para confirmar que la latencia agregada se mantiene razonable (objetivo: <1s p95).
Correr los tests existentes del microservicio products (si hay suite) tras el cambio.
Archivos a modificar
ecommerce-2026-back/microservices/products/utils/utils-products.ts — reemplazar SEARCH_SYNONYMS/BRAND_VARIATIONS por los diccionarios ampliados + RELATED_CATEGORY_TERMS
PHRASE_INTENTS, y la nueva expandBusquedaTerms (eliminar el código muerto processIntelligentSearch/filterProductsBySearch/generateSearchHighlights que quedaría reemplazado).
ecommerce-2026-back/microservices/products/utils/similitud-nombres.ts — exportar normalizarNombre para reuso (ya está, solo confirmar export público).
ecommerce-2026-back/microservices/products/service/products/products.service.ts — fetchAndCachePrismaProductos, getCatalogoV2, contarProductos (llamar expandBusquedaTerms, Promise.all de la procedure, merge/dedupe, cache key).
ecommerce-2026-back/microservices/products/utils/utils-products.ts (contarProductosV2) — mismo tratamiento de OR de términos.
(Opcional, fuera del alcance inmediato salvo que el usuario lo pida) eliminar o dejar documentado como no usado el searchPipelineProducts.js muerto del admin frontend, ya que el admin no tiene ni tendrá su propio pipeline de búsqueda — la lógica vive solo en el backend.