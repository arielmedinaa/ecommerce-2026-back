# Carga masiva de imágenes de producto

Herramienta de una sola vez (no un servicio): busca en Bing Images (Google bloquea con CAPTCHA
desde la primera request automatizada, probado), convierte a `.webp` <1MB
y sube al endpoint que ya existe (`POST /api/products/:codigo/images`, que ya valida formato y
tamaño). Excluye marca JOTA (código 257).

## Setup

```bash
cd scripts/bulk-product-images
npm install
```

Necesitás dos túneles activos hacia el cluster local (mismos que se usaron durante la sesión de
Bancard):

```bash
kubectl port-forward svc/api-gateway 3100:3100 &
kubectl port-forward svc/mariadb 3307:3306 &
```

La DB externa (ECONT, catálogo real) se conecta directo por IP (`192.168.100.100:3306`), no necesita túnel — ya lo confirmamos alcanzable desde esta red.

## Uso

```bash
# 1. Genera worklist.json (productos que necesitan imágenes)
node find-missing.js --limit 5      # probar con 5 primero
node find-missing.js                # sin --limit: los 1692 candidatos reales

# 2. Busca, convierte y sube
node scrape-and-upload.js --limit 5           # prueba real (sube de verdad)
node scrape-and-upload.js --limit 5 --dry-run # solo descarga/convierte, no sube nada
node scrape-and-upload.js                     # corrida completa
```

`scrape-and-upload.js` es reanudable: `results.log` (JSONL) registra qué `codigo_articulo` ya
quedó en `status: "ok"` y los saltea si se vuelve a correr.

## Variables de entorno (todas opcionales, tienen default de dev local)

| Variable | Default |
|---|---|
| `GATEWAY_URL` | `http://localhost:3100/api` |
| `ECONT_DB_HOST` | `192.168.100.100` |
| `ECONT_DB_PORT` | `3306` |
| `ECONT_DB_USER` | `root` |
| `ECONT_DB_PASSWORD` | `classicS` |
| `ECONT_DB_DATABASE` | `ssss_emp1` |
| `ECOMMERCE_DB_HOST` | `localhost` (vía el port-forward de mariadb) |
| `ECOMMERCE_DB_PORT` | `3307` |
| `ECOMMERCE_DB_USER` / `ECOMMERCE_DB_PASSWORD` | `ecommerce` / `ecommerce` |
| `ECOMMERCE_DB_DATABASE` | `ecommerce` |

Para producción: apuntar `GATEWAY_URL` al gateway real y las variables `ECOMMERCE_DB_*` a esa DB
(ya no hace falta el port-forward de mariadb si es accesible directo).

## Notas / riesgos conocidos

- Las imágenes salen de Bing Images (búsqueda genérica) — no de un proveedor con derechos
  garantizados. Riesgo legal/copyright asumido para esta prueba.
- El matching producto↔imagen es automático (`"{marca} {nombre}"`) — puede traer resultados
  incorrectos para nombres ambiguos. Revisar `results.log` y los productos con `status: "partial"`
  o `"error"` manualmente.
- Bing puede eventualmente limitar/bloquear si se corre muy rápido o muy seguido — por eso el
  delay aleatorio entre productos. Si empieza a fallar todo de golpe, es la señal más probable.
