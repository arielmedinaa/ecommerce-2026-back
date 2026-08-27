# 5. Almacenamiento de imágenes (DigitalOcean Spaces)

## Historia: por qué no seguimos con LocalStack

Hasta que se migró a DO Spaces, las imágenes (banners, fotos de producto, documentos de proveedores) se guardaban en un bucket S3 servido por **LocalStack** (`localstack/localstack:3.5`), corriendo como un pod más dentro del cluster. Se intentó hacerlo persistente con un `PersistentVolumeClaim` (`hostPath` en `worker-1`, `PERSISTENCE=1`), pero **LocalStack Community no persiste de forma confiable pese a eso** — es una limitación conocida de la edición gratuita, no un error de configuración nuestro. Cada vez que el pod se reiniciaba (crash, redeploy, o simplemente `kubectl rollout restart` de otro fix sin relación), el bucket volvía vacío.

Esto causó pérdida real de datos más de una vez, la más grave: un reinicio del pod de LocalStack borró **el 99% de las imágenes de producto** (1160 de 1170) y 3 banners recién subidos, porque el único backup en disco (`/opt/ecommerce/bucket-import/`) tenía varios días de antigüedad. Las imágenes de producto perdidas **no tenían fuente recuperable** — se habían subido por archivo directo (`POST /api/products/:codigo/images`, multipart), no por URL externa, así que no había forma de volver a descargarlas automáticamente.

**Decisión**: migrar a **DigitalOcean Spaces**, que es S3-compatible (mismo código, `@aws-sdk/client-s3`, solo cambian credenciales y endpoint) y tiene persistencia real, por ~$5 USD/mes.

## Configuración actual

- **Bucket**: `centralshop-ecommerce-images`
- **Región**: `nyc3` (los droplets del cluster están en `nyc1`, que no es una región válida de Spaces — se usa la más cercana).
- **Endpoint**: `https://nyc3.digitaloceanspaces.com`
- **Credenciales**: Spaces Access Key / Secret Key (**no** son las mismas que un Personal Access Token de la API general de DO — son un tipo de credencial S3-compatible distinto, generado vía `/v2/spaces/keys`).

Variables de entorno relevantes (en el `ConfigMap ecommerce-config` / `Secret ecommerce-secrets` de K8s, y en `.env` de Podman):

```env
IMAGE_STORAGE_PROVIDER=s3
IMAGE_S3_BUCKET=centralshop-ecommerce-images
IMAGE_S3_ENDPOINT=https://nyc3.digitaloceanspaces.com
IMAGE_S3_REGION=nyc3
IMAGE_S3_KEY_PREFIX=banners
IMAGE_S3_ENSURE_BUCKET=true
IMAGE_S3_SIGNED_URLS=true
IMAGE_S3_SIGNED_URL_TTL_SECONDS=300
AWS_ACCESS_KEY_ID=<spaces access key>
AWS_SECRET_ACCESS_KEY=<spaces secret key>
AWS_REGION=nyc3
```

Servicios que usan este storage (todos importan `shared/common/services/image-storage.service.ts`): **`image-service`**, **`products-service`**, **`etl-service`**.

## Cómo crear el Space y las claves desde cero (si hay que rehacerlo)

Requiere un **Personal Access Token de la API general de DO** (`dop_v1_...`, con permiso de escritura) — se genera en `cloud.digitalocean.com/account/api/tokens`. No confundir con las Spaces Keys, que son un paso posterior.

```bash
# 1. Generar Spaces Keys (S3-compatible) con permiso full-access:
curl -s -X POST "https://api.digitalocean.com/v2/spaces/keys" \
  -H "Authorization: Bearer $DO_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"ecommerce-images-key","grants":[{"bucket":"","permission":"fullaccess"}]}'
# -> devuelve access_key y secret_key. SIN "grants" explícito, la key sale sin permisos y todo da AccessDenied.
```

```bash
# 2. Crear el bucket, usando esas Spaces Keys (no el token de la API general) con el SDK de S3:
node -e "
const { S3Client, CreateBucketCommand } = require('@aws-sdk/client-s3');
const client = new S3Client({
  endpoint: 'https://nyc3.digitaloceanspaces.com',
  region: 'nyc3',
  credentials: { accessKeyId: '<access_key>', secretAccessKey: '<secret_key>' },
});
client.send(new CreateBucketCommand({ Bucket: 'centralshop-ecommerce-images' }))
  .then(() => console.log('OK'))
  .catch(e => console.error(e.name, e.message));
"
```

> `image-service` ya tiene `@aws-sdk/client-s3` instalado — más simple correr este script vía `kubectl exec <pod-de-image-service> -- node -e "..."` que instalar el SDK en otro lado.

## Migrar/copiar datos entre buckets S3-compatibles (ej. LocalStack → DO Spaces)

Patrón genérico, listar+leer del origen y escribir al destino con dos `S3Client` distintos en el mismo script:

```js
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const src = new S3Client({ endpoint: 'http://localstack:4566', region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: 'test', secretAccessKey: 'test' } });
const dst = new S3Client({ endpoint: 'https://nyc3.digitaloceanspaces.com', region: 'nyc3', forcePathStyle: true, credentials: { accessKeyId: '<...>', secretAccessKey: '<...>' } });
// ListObjectsV2 (paginado con ContinuationToken) -> GetObject -> streamToBuffer -> PutObject al destino, mismo Key.
```

Correrlo desde un pod que ya tenga red hacia ambos endpoints (`image-service` puede llegar a `localstack:4566` por DNS interno de K8s, y a Spaces por internet saliente).

## Verificar que el storage está sirviendo bien

```bash
# Un banner conocido (ajustar nombre real):
curl -sk -o /dev/null -w 'HTTP %{http_code}\n' "https://ecommercebackv1.jjemp.com/api/image/banner/<nombre>/desktop"

# Una imagen de producto conocida:
curl -sk -o /dev/null -w 'HTTP %{http_code}\n' "https://ecommercebackv1.jjemp.com/api/products/images/<codigo>_<timestamp>.webp"
```

Ambas rutas **proxean los bytes a través del backend** (no son URLs directas al bucket), así que un 404 puede significar tanto "el archivo no existe en el bucket" como "el registro en la base de datos apunta a un `key` que no coincide" — si da 404, primero confirmar contra la base de datos cuál es el `key`/`dimensiones` esperado antes de asumir que el archivo se perdió.

## Costo

DigitalOcean Spaces: **$5 USD/mes** de base, incluye 250 GB de storage + 1 TB de transferencia saliente. Excedentes: $0.02/GB storage extra, $0.01/GB transferencia extra. El volumen actual del ecommerce (banners + fotos de producto) está muy por debajo de esos topes.
