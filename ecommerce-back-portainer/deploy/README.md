# Deploy en Portainer (Docker Compose)

`ecommerce-back-portainer/` es un despliegue **independiente** del repo
principal (`ecommerce-2026-back/`, que va hacia AWS + Kubernetes) — pensado
para correr en Portainer/Docker Compose, sin Kubernetes. Tiene su PROPIA copia
del código (`api-gateway/`, `microservices/`, `shared/`, `package.json`,
`tsconfig*.json` en la raíz de esta carpeta), sincronizada una vez a partir del
repo principal (ya corregido: NATS, 9 servicios, MariaDB, Redis, LocalStack).

**Importante — mantenimiento:** a partir de ahora son dos códigos separados.
Un cambio en `ecommerce-2026-back/microservices/...` NO se refleja acá solo;
hay que volver a copiarlo a mano (`rsync -a --exclude=node_modules
--exclude=dist ../microservices/ microservices/` desde esta carpeta, o pedirme
que sincronice puntualmente lo que cambió).

El `docker-compose.yml` builda 100% en local: `context: ..` apunta a la raíz
de `ecommerce-back-portainer/` (no al repo principal), así que este directorio
se puede copiar/mover a otra máquina o subir a Portainer sin depender de nada
fuera de sí mismo.

Reemplaza por completo el `docker-compose-all-services.yml` viejo (arquitectura
pre-NATS, sin mail/etl-service).

## Servicios

| Servicio | Puerto | Notas |
|---|---|---|
| `api-gateway` | 3100 (expuesto) | Único punto de entrada HTTP |
| `auth-service` | 3101 | interno |
| `cart-service` | 3102 | interno |
| `content-service` | 3103 | interno |
| `payments-service` | 3105 | interno, usa SQS (LocalStack) |
| `products-service` | 3106 | interno |
| `image-service` | 3107 | interno, usa S3 (LocalStack) |
| `mail-service` | 3108 | interno |
| `etl-service` | 3109 | interno, agente Claude de Dropshipping |
| `mariadb` | — | DB `ecommerce` + `combos`, con el schema real volcado en `mariadb-init/002-schema.sql` |
| `redis` | — | cache/tracking |
| `nats` | — | transporte entre microservicios |
| `localstack` | 4566 (expuesto) | S3 + SQS, **con persistencia** (`PERSISTENCE=1` + volumen) |

## Cómo levantar

```bash
cd ecommerce-back-portainer/deploy
cp .env.example .env
# completar ANTHROPIC_API_KEY, CORREO_PASS, VAPID_*, JWT_SECRET reales antes de levantar
docker compose build
docker compose up -d
```

En Portainer: subir la carpeta `ecommerce-back-portainer/` completa como Stack
(el build necesita `context: ..` para llegar a `api-gateway/`, `microservices/`,
`shared/` que ahora viven ACÁ, no en el repo principal), y cargar las
variables de `.env.example` en la sección "Environment variables" del stack
(o subir un `.env` junto al compose).

## Build de producción

Cada servicio se compila con TypeScript (`tsc` + `tsc-alias`, ver
`deploy/docker/Dockerfile.prod` — hay una copia local acá, self-contained) en
vez de correr con `ts-node` como en dev — arranque más rápido y bastante menos
RAM por contenedor. Si cambiás código, hay que rebuildear la imagen del
servicio afectado (`docker compose build <servicio>`), no hay hot-reload.

**Excepción:** `etl-service` sigue necesitando `ts-node` disponible en runtime
(no solo en build) porque el agente de Dropshipping genera y `require()` en
caliente archivos `.ts` por proveedor después del deploy — por eso su imagen
no hace un install `--production` que podría podar esa dependencia.

## MariaDB — schema inicial

`mariadb-init/001-databases.sql` crea las bases `ecommerce` y `combos` y los
permisos del usuario `ecommerce`. `mariadb-init/002-schema.sql` es un volcado
**solo de estructura** (`mysqldump --no-data`) tomado del cluster kind real —
no trae datos, arranca con las tablas vacías. Si además querés datos de
ejemplo, se puede agregar un `003-seed.sql` (pedime que lo genere).

`SYNCRONICE=false` en el `.env` (igual que en el cluster kind) — TypeORM NO
crea/modifica tablas solo. Cambios de schema futuros se aplican a mano contra
`mariadb`, igual que se hace hoy en el cluster kind (no hay un sistema de
migraciones formal todavía).

**Nota — una sola base compartida (decisión deliberada):** el cluster kind
real usa database-per-service (`auth_db`, `cart_db`, `content_db`,
`payments_db`, `image_db`, más `ecommerce` para products/mail/etl), pero acá
en Portainer/staging los 9 servicios comparten `DATABASE_NAME=ecommerce`
para todos. Es intencional (menos complejidad operativa mientras esto sea un
ambiente de pruebas) — no repliques el split per-service sin que te lo pidan.
Consecuencia práctica: cualquier tabla nueva que un servicio necesite
(ejemplo real: `auth-service` y su tabla `roles`, que en kind vive en
`auth_db` pero acá hay que crearla en `ecommerce`) hay que crearla a mano en
`ecommerce`, aunque en kind viva en la base propia de ese servicio.

## LocalStack

Se mantiene LocalStack (S3 para imágenes de producto/documentos de proveedor,
SQS para el worker de pagos) pero con `PERSISTENCE=1` + volumen dedicado
(`localstack-data`), a diferencia del cluster kind donde LocalStack Community
no persistía y causó pérdida de imágenes de producto. El bucket S3
(`ecommerce-images`) y la cola SQS (`payments-jobs`) se auto-crean al bootear
`image-service`/`payments-service` — no hace falta ningún init script aparte.

Si en algún momento esto pasa a ser un ambiente real de producción (no de
pruebas), reemplazar LocalStack por S3/SQS de AWS real.
