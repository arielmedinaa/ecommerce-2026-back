# 2. Despliegue

No hay CI/CD ni registry de imágenes (Docker Hub, DO Container Registry, etc.). Todo el flujo es manual, vía SSH con contraseña. Esta guía es el checklist real que se sigue cada vez.

## Credenciales:
ecommerce-back-staging  198.211.104.197
worker-RDS  143.198.170.193
worker-2  67.205.169.13
worker-1 143.244.166.116
usuario root
contraseña A2468b2402

## Acceso

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no root@ecommercebackv1.jjemp.com
```

> Siempre forzar `PreferredAuthentications=password` — el servidor tiene auth por key habilitada y, si se agotan los intentos de key antes de caer a password, la conexión se corta sin pedir contraseña.

Rutas del código fuente en el servidor:
- `/opt/ecommerce/ecommerce-back-portainer/` — el árbol que usa **Podman** (`docker-compose`).
- El mismo árbol se usa como base para exportar imágenes hacia K8s (no hay una segunda copia separada).

## Flujo completo: de un cambio de código a producción

### 0. Verificar antes de tocar nada

```bash
# Desde el repo local, con el tsconfig real que usa el Dockerfile de build:
npx tsc --noEmit -p tsconfig.prod.json
```

Si hay cambios grandes o reordenamientos de archivos, comparar contra el baseline commiteado para no confundir ruido preexistente con errores nuevos:

```bash
git stash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "error TS" | sort > /tmp/baseline.txt
git stash pop
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "error TS" | sort > /tmp/actual.txt
diff /tmp/baseline.txt /tmp/actual.txt
```

> **Importante**: `tsconfig.json` (el que usa `tsc --noEmit` sin flags) es más estricto (`strictNullChecks: true`) que `tsconfig.prod.json` (el que usa el Dockerfile real, `strictNullChecks: false`). Es normal ver decenas de errores de "Type 'null' is not assignable" con el primero que **no** bloquean el build real. El que importa para saber si el build va a pasar es siempre `tsconfig.prod.json`.

### 1. Sincronizar el código al servidor

Para 1-2 archivos puntuales, `scp` directo:

```bash
scp -o PreferredAuthentications=password -o PubkeyAuthentication=no \
  api-gateway/src/modules/cart/controllers/cart.controller.ts \
  root@ecommercebackv1.jjemp.com:/opt/ecommerce/ecommerce-back-portainer/api-gateway/src/modules/cart/controllers/cart.controller.ts
```

Para cambios grandes (varios archivos, renombres, reorganización de carpetas), usar `rsync` en vez de copiar archivo por archivo:

```bash
sshpass -p "$SSH_PASS" rsync -az --delete \
  --exclude node_modules --exclude dist --exclude .git --exclude '*.tsbuildinfo' \
  ./microservices/products/ \
  root@ecommercebackv1.jjemp.com:/opt/ecommerce/ecommerce-back-portainer/microservices/products/
```

> Ojo con `--delete` en `shared/`: si hay archivos en el servidor que no existen en tu copia local por alguna razón, se van a borrar. Usarlo solo cuando estés seguro de que tu copia local es la fuente de verdad completa.

### 2. Build de la imagen (una sola vez, sirve para los dos entornos)

```bash
cd /opt/ecommerce/ecommerce-back-portainer/deploy
docker-compose build <servicio-1> <servicio-2> ...
```

El Dockerfile (`deploy/docker/Dockerfile.prod`) es **genérico**: copia `api-gateway/`, `microservices/` y `shared/` completos, corre `npx tsc -p tsconfig.prod.json && npx tsc-alias -p tsconfig.prod.json` una sola vez, y cada imagen de servicio solo difiere en el `ARG SERVICE_MAIN` (ej. `dist/microservices/cart/main.js`). Por eso conviene buildear todos los servicios afectados en un solo `docker-compose build` — comparten capas de build.

Esto puede tardar 2-4 minutos por batch de varios servicios; en este entorno de shell suele exceder el timeout de 120s de un comando en foreground — lanzarlo en background y sondear el resultado en vez de asumir que falló.

### 3. Redesplegar en Podman (entorno legado, igual se mantiene al día)

```bash
docker-compose up -d --no-deps <servicio-1> <servicio-2> ...
```

`--no-deps` es clave: sin eso, Compose puede intentar recrear también contenedores dependientes (por ejemplo `mariadb`), lo que alguna vez revirtió una configuración `read_only` que solo estaba seteada dentro del contenedor y no en un archivo montado desde el host.

Verificar que arrancó bien:

```bash
podman logs --tail 20 deploy-<servicio>-1
```

Buscar la línea `Nest application successfully started` y, para servicios NATS, `Microservice configured with NATS transport, queue group ..._QUEUE`. Si ves reintentos de conexión a MariaDB en loop, revisar credenciales/nombre de base antes de seguir.

### 4. Exportar la imagen y llevarla a los 3 nodos de K8s

**No hay registry**, así que cada imagen se transporta a mano como archivo `.tar`:

```bash
# En ecommerce-back-staging (control-plane):
podman save localhost/ecommerce-<servicio>:latest -o /tmp/<servicio>.tar
ctr -n k8s.io images import /tmp/<servicio>.tar
ctr -n k8s.io images tag localhost/ecommerce-<servicio>:latest docker.io/library/ecommerce-<servicio>:latest

# Copiar a los workers:
scp /tmp/<servicio>.tar root@<worker-1-ip>:/tmp/
scp /tmp/<servicio>.tar root@<worker-2-ip>:/tmp/

# En cada worker:
ctr -n k8s.io images import /tmp/<servicio>.tar
```

> El re-tag a `docker.io/library/...` es necesario porque los manifiestos de K8s (`deploy/k8s/prod/*.yaml`) referencian la imagen sin el prefijo `localhost/` que usa Podman por defecto.

### 5. Reiniciar el Deployment en K8s

```bash
kubectl rollout restart deployment/<servicio-1> deployment/<servicio-2>
kubectl rollout status deployment/<servicio-1> --timeout=90s
```

Como `imagePullPolicy` efectivamente se resuelve a "usar lo que ya está en el nodo" (no hay registry del que hacer `pull`), `rollout restart` recrea los pods con la imagen `:latest` que ya quedó importada en el paso anterior.

**Si un pod nuevo queda en `ErrImageNeverPull`**: ese nodo específico no tiene la imagen importada (pasa seguido si HPA programa un pod nuevo en un nodo al que nunca le tocó recibir esa imagen). Solución: repetir el `ctr images import` en ese nodo puntual y luego `kubectl delete pod <pod>` para forzar un reintento de scheduling.

### 6. Verificar

Ver [`03-pruebas-y-verificacion.md`](./03-pruebas-y-verificacion.md) — como mínimo, `/api/health` y el/los endpoint(s) específicos que tocaste, 2-3 veces seguidas (los primeros segundos post-deploy pueden dar una respuesta lenta/errónea por conexiones todavía calentando, no lo tomes como fallo real sin repetir la prueba).

## Limpieza post-deploy

Cada `podman save` genera un `.tar` de **~900 MB**. En `worker-1`/`worker-2` (30 GB de disco) esto se acumula rápido y puede dejarlos con menos del 20% libre en pocos días de trabajo activo:

```bash
# En control-plane y en cada worker, después de confirmar que el deploy funcionó:
rm -f /tmp/*.tar
df -h /   # confirmar espacio liberado
```

No hay ninguna automatización de esto todavía — es un paso manual que hay que acordarse de hacer.

## Rollback

No hay versionado de imágenes (todo es `:latest`), así que un rollback real requiere:

1. Si tenés el `.tar` anterior todavía en `/tmp` en algún nodo (no se limpia automáticamente hasta que alguien lo hace a mano), reimportarlo y hacer `rollout restart`.
2. Si no, `git checkout` de la versión anterior del código en local, y repetir el flujo de despliegue completo desde el paso 1.

**No hay snapshot/backup automático de imágenes Docker.** Si necesitás poder revertir rápido, considerá taguear manualmente la imagen anterior antes de sobreescribir `:latest` (`podman tag ... :latest ... :pre-<fecha>`) — no es una práctica establecida hoy, pero es barata de adoptar.
