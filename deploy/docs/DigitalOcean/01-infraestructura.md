# 1. Infraestructura

## Droplets del backend

Todos en la región **nyc1**, tier `g-2vcpu-8gb-intel` salvo el principal.

| Nombre DO | Rol | IP pública | IP privada | Disco |
|---|---|---|---|---|
| `ecommerce-back-staging` | Control-plane de K8s **+** nodo worker **+** stack Podman legado | `ecommercebackv1.jjemp.com` | `10.116.0.3` | 160 GB |
| `worker-1` | Worker de K8s | *(ver DO)* | `10.116.0.5` | 30 GB |
| `worker-2` | Worker de K8s | *(ver DO)* | `10.116.0.6` | 30 GB |
| `worker-RDS` | MariaDB (única base compartida) + Redis | *(ver DO)* | `10.116.0.7` | 30 GB |
| `ecommerce-front-staging` | Frontend (TanStack Start, `pm2`) | `159.65.221.99` | `10.116.0.4` | 160 GB |

> **`worker-1` y `worker-2` son chicos (30 GB)** y se llenan rápido con las imágenes Docker que transferimos a mano (~900 MB cada una). Ver el checklist de limpieza en [`02-despliegue.md`](./02-despliegue.md#limpieza-post-deploy).

Para consultar el estado real (tamaños de disco declarados, IPs, etc.) vía API de DO:

```bash
curl -s "https://api.digitalocean.com/v2/droplets" \
  -H "Authorization: Bearer $DO_TOKEN" | python3 -m json.tool
```

## Por qué `ecommerce-back-staging` es control-plane *y* worker

Originalmente el control-plane tenía el taint estándar de K8s (`node-role.kubernetes.io/control-plane:NoSchedule`) y no corría pods de aplicación. Cuando el tráfico creció lo suficiente como para que `wk1`/`wk2` solos no alcanzaran, se le sacó el taint para que también sirva tráfico real:

```bash
kubectl taint nodes ecommerce-back-staging node-role.kubernetes.io/control-plane:NoSchedule-
```

Esto significa que **los 3 nodos** (`ecommerce-back-staging`, `worker-1`, `worker-2`) corren pods de aplicación por igual, balanceados por `podAntiAffinity` + HPA.

## Base de datos: una sola schema compartida

A diferencia de un diseño "database-per-service" clásico, **este cluster usa una única base `ecommerce`** en `worker-RDS` (`10.116.0.7:3306`) para los 9 servicios. Fue una decisión deliberada de la migración a K8s (no accidental) — si necesitás una tabla nueva para un servicio, se crea ahí mismo, a mano.

También corre ahí **Redis** (`10.116.0.7:6379`), compartido por todos los servicios (cache de home, cache de catálogo JOTA, plantillas de proveedores, etc.).

## Los 9 servicios

| Servicio | Puerto interno | Notas |
|---|---|---|
| `api-gateway` | 3100 (NodePort `30100`) | Único punto de entrada HTTP. Expuesto públicamente vía nginx de host. |
| `auth-service` | 3101 | |
| `cart-service` | 3102 (proceso real escucha en **4002**, no en `PORT`) | Ver troubleshooting de puertos hardcodeados. |
| `content-service` | 3103 | Home, landings, verticales, dashboard. |
| `payments-service` | 3105 | |
| `products-service` | 3106 (proceso real escucha en **4000**) | Conecta también al ERP de CentralShop (dos DataSources TypeORM: `READ_CONNECTION`/`WRITE_CONNECTION`). |
| `image-service` | 3107 | Banners, subida/servido de imágenes. |
| `mail-service` | 3108 | Confirmaciones de pedido, correos. |
| `etl-service` | 3109 | |

Todos hablan entre sí por **NATS** (`nats://nats:4222` en Podman, Service `nats` en K8s), no por HTTP directo. El transporte de NestJS usa `queue group`s (`AUTH_SERVICE_QUEUE`, `CART_SERVICE_QUEUE`, etc.) para que múltiples réplicas de un mismo servicio se repartan la carga sin duplicar el procesamiento de un mismo mensaje.

## Dependencia externa: el ERP de CentralShop

`products-service` y `cart-service` consultan una base MySQL del ERP interno de CentralShop (`webservice.centralshop.com.py`, puerto 3055/3306 según el flujo) para:
- Catálogo JOTA y listado completo de artículos (`proc_obtener_listado_articulos_ecommerce*`, stored procedures).
- Estado de solicitudes/pedidos (`solicitudcab`, `cs_solicitud_ecommerce_cabecera`).

**Esta dependencia es la causa raíz de la mayoría de los timeouts intermitentes** que vimos en producción — ver [`04-troubleshooting.md`](./04-troubleshooting.md#timeouts-intermitentes-el-patron-mas-comun).

## Nginx: el balanceador real

No hay Ingress Controller de K8s instalado. El balanceo lo hace un **nginx a nivel de sistema operativo** (systemd, no containerizado) en `ecommerce-back-staging`, en `/etc/nginx/sites-available/ecommercebackv1` (no está trackeado en el repo). Usa `least_conn` contra los 3 nodos por IP privada + NodePort del `api-gateway`:

```nginx
upstream api_gateway_backend {
    least_conn;
    server 10.116.0.3:30100;  # control-plane
    server 10.116.0.5:30100;  # worker-1
    server 10.116.0.6:30100;  # worker-2
}
```

Esto es un **punto único de falla** conocido: si `ecommerce-back-staging` cae, cae el balanceador entero (no solo un tercio del tráfico). Está aceptado como riesgo por ahora, no resuelto.

## Autoscaling

- **HPA** (`kubectl get hpa`) en `api-gateway`, `cart-service`, `products-service`: `min:2, max:6`, `targetCPUUtilizationPercentage:70` (relativo a los `resources.requests` del pod, no a la capacidad del nodo — ver troubleshooting si el % parece "imposible", como >300%).
- **`podAntiAffinity`** (preferido, no obligatorio) para repartir réplicas entre nodos distintos.
- **`readinessProbe`/`livenessProbe`**: HTTP en `api-gateway` (`/api/health:3100`), TCP en `cart-service` (puerto real **4002**) y `products-service` (puerto real **4000**) — no HTTP, porque esos dos no tienen endpoint de salud.
- **`metrics-server`** instalado con `--kubelet-insecure-tls` (necesario en este cluster kubeadm sin certificados propios entre nodos).

## Storage de imágenes

Ver [`05-almacenamiento-imagenes.md`](./05-almacenamiento-imagenes.md) — migrado de LocalStack (efímero, perdía datos en cada reinicio de pod) a **DigitalOcean Spaces** (persistente, S3-compatible).
