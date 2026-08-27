# 3. Pruebas y verificación

## Smoke test mínimo después de cualquier deploy

```bash
curl -sk https://ecommercebackv1.jjemp.com/api/health -w '\nHTTP %{http_code} %{time_total}s\n'
```

> `curl -k` es necesario en este entorno: el certificado del dominio da `self-signed certificate` desde algunas máquinas locales por un problema de trust store no relacionado a la infra — es preexistente, no una regresión.

Para el/los endpoints específicos que tocaste, probar **2-3 veces seguidas**, no una sola:

```bash
for i in 1 2 3; do
  curl -sk -X POST https://ecommercebackv1.jjemp.com/api/content/home \
    -H 'Content-Type: application/json' -d '{"limit":6,"offset":0}' \
    -o /dev/null -w "intento $i: HTTP %{http_code} time=%{time_total}s\n"
done
```

Los primeros 1-2 minutos después de un `rollout restart` son ruidosos: pods recién creados todavía completando conexiones (MariaDB, Redis, NATS, ERP), así que un error aislado justo después del deploy no es necesariamente el bug — repetir antes de alarmarse. Si el error persiste en la 2ª/3ª repetición, ahí sí es real.

## Probar con un usuario real autenticado

Varios endpoints requieren JWT (`Authorization: Bearer <token>`). Para conseguir uno de prueba rápido, hay dos caminos:

1. **Pedirle al usuario un token real** de una sesión activa (lo más representativo).
2. **Mintear uno manualmente** dentro de un pod, usando el `JWT_SECRET` real del entorno:

```bash
kubectl exec <pod-de-cualquier-servicio> -- node -e "
const jwt = require('jsonwebtoken');
console.log(jwt.sign({ sub: '90', perfil: 'cliente' }, process.env.JWT_SECRET, { expiresIn: '5m' }));
"
```

> Los tokens minteados así expiran rápido (5 min es buena práctica) — si una prueba tarda, re-mintear antes de asumir que el fallo es de auth.

## Ejecutar consultas SQL de verificación sin exponer credenciales

**No** hacer `printenv` ni volcar variables de entorno con contraseñas a la salida del terminal (el clasificador de permisos del entorno lo bloquea, y es buena práctica igual). En cambio, ejecutar el query **dentro** de un pod que ya tiene esas credenciales en sus propias variables de entorno, para que nunca se impriman:

```bash
kubectl exec <pod> -- node -e "
const mysql = require('mysql2/promise');
(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DATABASE_HOST, port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USER, password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
  const [rows] = await conn.query('SELECT ...');
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
"
```

> Siempre terminar con `conn.end()` **y** `process.exit(0)` explícito — si la conexión mysql2 queda abierta y el script solo cae en un `catch` sin cerrar, el proceso de Node no termina solo y `kubectl exec` queda colgado hasta el timeout del comando.

## Revisar logs

```bash
# Últimos N minutos de todas las réplicas de un servicio, con prefijo de pod:
kubectl logs -l app=<servicio> --since=10m --prefix

# Buscar un patrón puntual:
kubectl logs -l app=<servicio> --since=30m --prefix | grep -i 'error\|timeout'
```

Tené en cuenta la **edad de los pods** al leer logs: un `rollout restart` reciente (por ejemplo, para desplegar un fix de *otro* endpoint) borra el historial de logs de todo lo que pasó antes en ese pod. Si estás buscando evidencia de un error que el usuario reportó "hace un rato", primero chequeá `kubectl get pods -o wide` — si los pods son más nuevos que el reporte, la evidencia ya no está.

## Prueba de carga

Herramienta: **`hey`** (Go), instalado en el droplet de producción en `/root/go/bin/hey`.

> Ojo: existe también un `/usr/local/bin/hey` en el mismo servidor que es un binario roto de un intento de instalación anterior — confirmar que se está usando el de `/root/go/bin/hey` antes de correr nada (`which hey` puede mentir si el PATH prioriza el roto).

Ejemplo, carga liviana contra un endpoint sin DB:

```bash
/root/go/bin/hey -z 60s -c 40 https://ecommercebackv1.jjemp.com/api/health
```

Ejemplo, carga pesada contra endpoints reales que sí tocan DB/cache/ERP (para forzar que el HPA de `cart-service`/`products-service` reaccione, no solo el de `api-gateway`):

```bash
/root/go/bin/hey -z 90s -c 80 -m POST -H 'Content-Type: application/json' \
  -d '{"limit":6,"offset":0}' \
  https://ecommercebackv1.jjemp.com/api/content/home
```

Monitorear en paralelo (otra terminal):

```bash
watch -n 3 kubectl get hpa
watch -n 3 'kubectl get pods -o wide | grep -E "api-gateway|cart-service|products-service"'
```

**Cómo leer el `%` de CPU del HPA**: es relativo a `resources.requests.cpu` del pod, **no** a la capacidad del nodo. Un pod con `requests: cpu: 100m` que usa 350m real muestra `350%` — no es un error de medición, es que el request está seteado bajo a propósito para que el HPA sea sensible y escale temprano.

## Qué mirar durante/después de una prueba de carga

- `kubectl get hpa` — ¿escalaron réplicas de verdad, o se quedaron en el mínimo? Si un servicio no recibe tráfico directo en la prueba (por ejemplo, probaste solo `/api/health` y no tocaste `cart`/`products`), su HPA no va a reaccionar — no es un bug, es que no hubo carga real sobre ese servicio.
- Distribución de pods por nodo (`-o wide`) — con `podAntiAffinity` deberían repartirse entre los 3 nodos, no apilarse todos en uno.
- Latencia del API server de K8s mismo (`kubectl get nodes`, ¿tarda mucho en responder durante la prueba?) — si el control-plane está saturado sirviendo tráfico de aplicación *y* respondiendo al propio API de K8s, ahí es donde el diseño de 3 nodos "todos worker" empieza a mostrar el límite.
- Logs de error de conexión al ERP (`grep -i erp` en los logs de `cart-service`/`products-service`) — el ERP es la dependencia más frágil del sistema; una prueba de carga agresiva puede tumbar la conectividad hacia él antes que cualquier otra cosa.
