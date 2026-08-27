# 4. Troubleshooting

Problemas reales que ya se dieron en producción, con causa raíz confirmada. Si algo de esta lista te suena parecido a lo que estás viendo, andá directo a la sección — probablemente sea lo mismo.

## Timeouts intermitentes (el patrón más común)

**Síntoma**: un endpoint que normalmente responde rápido, de repente tarda ~60 segundos y devuelve `504 Gateway Time-out` (de **nginx**, no de la aplicación).

**Causa raíz, siempre la misma forma**: en algún punto de la cadena `gateway → microservicio → (otro microservicio | ERP | DB)` hay una llamada **sin ningún timeout**. Mientras todo responde rápido, nunca se nota. El día que esa dependencia (casi siempre el ERP externo) tarda de más, la petición completa queda colgada indefinidamente hasta que **nginx** — no la aplicación — la corta a los 60 segundos con un 504 genérico que no dice nada sobre la causa real.

Ya se encontró y arregló este patrón exacto en:
- `products.controller.ts` → `get_products_jota` (el proc del ERP tarda 13-77s).
- `content.controller.ts` → `get_home_content` (agrega `get_products_jota` puertas adentro).
- `cart.controller.ts` → `getAllCart` (consulta el estado de solicitud contra el ERP).
- `ResilientService.sendWithResilience` (`shared/common/decorators/resilient-client.decorator.ts`) — el helper "de resiliencia" que usan `auth`, `cart`, `content` y `products` **no tenía timeout real** (y el `retries` que dice tener es código muerto, nunca se ejecuta).

**Cómo diagnosticar uno nuevo**:

1. Reproducir con `curl -w '%{time_total}'`. Si tarda ~60s exactos y da 504, es este patrón (nginx cortando).
2. Buscar la cadena de llamadas del endpoint: gateway → `cmd` de NATS → service → ¿toca DB del ERP, otro microservicio, o una API externa?
3. Buscar `.pipe(timeout(...))` en la llamada del gateway (`this.xClient.send(...)`). Si no está, ese es el primer punto sin protección.
4. Buscar si la llamada downstream (dentro del microservicio) también tiene timeout propio. Si usa `ResilientService.sendWithResilience`, confirmar que la versión desplegada ya tiene el fix de `timeoutMs` (ver el archivo — debe tener `rxTimeout` en el pipe de `executeWithRetry`).
5. Si la lentitud real está en una query directa a MySQL/ERP (no vía NATS), envolverla en un timeout explícito (`Promise.race` contra un `setTimeout` que rechaza) — mysql2 no tiene timeout de query nativo confiable en este proyecto.

**Fix estándar**: agregar timeout en dos capas — en el controller del gateway (`.pipe(timeout(N))`, N entre 10s y 25s según qué tan lenta es la dependencia real) **y** en la llamada downstream que toca la dependencia lenta, con un fallback razonable (cache stale, dato vacío, mensaje de "no disponible") en vez de propagar el error.

## El ERP externo es lento y frágil

El ERP de CentralShop (`webservice.centralshop.com.py`) es la dependencia externa más inestable del sistema:
- El stored procedure `proc_obtener_listado_articulos_ecommerce` puede tardar **13 a 77 segundos** incluso pidiendo pocas filas — es una query pesada (agregaciones sobre tablas de ventas/compras/transferencias de millones de filas) sin filtrar por marca/categoría hasta el final. Se optimizó parcialmente empujando el filtro más adentro, pero **no está resuelto de raíz** — sigue siendo lento, solo ya no cuelga la petición del usuario gracias a los timeouts.
- La conectividad de red hacia el ERP desde `worker-1`/`worker-2` fue intermitente en el pasado (puertos que CentralShop IT abría/cerraba de a uno) — si un servicio no logra conectar al ERP, revisar primero si es un problema de red (firewall del lado de CentralShop) antes de asumir que es un bug de código.

**No hay forma de arreglar la velocidad del ERP desde este repo** — es un sistema de terceros. La estrategia aceptada es: timeout + fallback + cache, nunca depender de que el ERP responda rápido.

## `cart-service` y `products-service` escuchan en un puerto distinto al declarado

Bug de aplicación conocido, no corregido: ambos servicios **ignoran la variable de entorno `PORT`** y tienen el puerto real hardcodeado en su `main.ts`:
- `cart-service`: puerto real **4002** (el manifiesto/Service dice `3102`).
- `products-service`: puerto real **4000** (el manifiesto/Service dice `3106`).

Si configurás un `readinessProbe`/`livenessProbe` TCP contra el puerto "documentado", el pod nunca pasa el probe y el rollout se cuelga con "connection refused". Los manifiestos de K8s ya están corregidos para apuntar a los puertos reales — si algún día se arregla el bug de origen (que respete `PORT`), hay que actualizar los manifiestos también.

## `ResilientService` no reintenta (a pesar del nombre)

`shared/common/decorators/resilient-client.decorator.ts` tiene un método `createRetryObservable` que implementa reintentos con backoff — pero **nunca se llama desde ningún lado**. `executeWithRetry` hace una sola llamada y, si falla, logea "Failed to execute command X after N retries" (mentira, cero reintentos ocurrieron) y relanza el error hacia el circuit breaker, que ahí sí puede caer a un `fallback` si hay uno configurado.

Esto **no se corrigió a reintentos reales** todavía — la razón es que agregar retries multiplicaría la latencia máxima de endpoints que hacen varias llamadas en paralelo (como `/api/content/home`, que llama a 5 servicios distintos con `Promise.all`). Si en algún momento se implementan retries de verdad, hay que re-calcular el presupuesto de tiempo total de esos endpoints agregados.

## Pérdida de imágenes / archivos en S3 (LocalStack)

Ver [`05-almacenamiento-imagenes.md`](./05-almacenamiento-imagenes.md) en detalle. Resumen: LocalStack Community (usado hasta que se migró a DO Spaces) **no persiste datos de forma confiable** entre reinicios del pod, incluso con un `PersistentVolumeClaim` correctamente montado — es una limitación conocida de la edición gratuita, no un error de configuración. Se perdieron banners e imágenes de producto más de una vez por esto antes de migrar a DigitalOcean Spaces.

## Falta de espacio en disco en `worker-1`/`worker-2`

Cada transferencia manual de imagen Docker (`podman save` → `scp` → `ctr import`) deja un `.tar` de ~900 MB en `/tmp` de cada nodo. Como no hay limpieza automática, esto se acumula rápido en los workers de 30 GB y puede dejarlos con <20% libre. Ver el paso de [limpieza post-deploy](./02-despliegue.md#limpieza-post-deploy) — hay que acordarse de hacerlo cada vez, no es automático.

## `SET GLOBAL` / cambios de config de MariaDB "desaparecen"

Si necesitás cambiar una configuración de MariaDB (ej. `read_only`) en el stack de Podman, **no la edites dentro del contenedor** (`SET GLOBAL ...` por consola, o editando el archivo de config en la capa escribible). Un `docker-compose up --force-recreate` de *cualquier* servicio que dependa de `mariadb` puede arrastrar la recreación del contenedor de `mariadb` también, y ahí se pierde cualquier cambio que no esté persistido en un archivo montado desde el host (`volumes:` en el `docker-compose.yml`).

## Cambios de config de NATS no toman efecto / crashea con "flag provided but not defined"

`nats-server` (imagen `nats:2.10-alpine`) **no acepta flags de configuración como `--max_payload`** en la línea de comandos — el binario no los reconoce y crashea en loop (`CrashLoopBackOff`). La única forma soportada es un archivo de config (`nats-server.conf`) pasado con `--config`, montado vía `ConfigMap` (K8s) o volumen (Podman). Ver `deploy/nats-server.conf` / `ecommerce-back-portainer/deploy/nats-server.conf`.

Si necesitás tocar el `Deployment` de `nats` en K8s con `kubectl patch`, usar `--patch-file` **sin** `--type merge` (dejar el default, que es *strategic merge*) — un merge patch tipo `--type merge` sobre el array `containers` reemplaza el elemento completo, incluyendo el campo `image`, y puede terminar borrándolo sin querer.
