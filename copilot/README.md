# Despliegue en AWS ECS Fargate con Copilot

Esta carpeta define cómo corre el backend en **ECS Fargate** (sin Kubernetes).
Cada subcarpeta `*/manifest.yml` es **un microservicio independiente** (un ECS Service).

## Qué es cada cosa (traducido desde k8s)

| Kubernetes | ECS Fargate | Archivo acá |
|---|---|---|
| Pod | Task (instancia corriendo) | — |
| Deployment | **ECS Service** (mantiene N tasks, autoescala) | cada `manifest.yml` |
| imagen + recursos | **Task Definition** | bloque `image`/`cpu`/`memory` |
| Node EC2 | **Fargate** (no administrás servidores) | — |
| Service DNS interno | **Cloud Map** | `nats://nats.<env>.<app>.local` |
| Ingress nginx | **ALB** | solo `api-gateway` |
| HPA | **Service Auto Scaling** | bloque `count.range` + `cpu_percentage` |
| ConfigMap | `variables` de la task | bloque `variables` |
| Secret | **SSM Parameter Store / Secrets Manager** | bloque `secrets` |
| kubectl apply | `copilot deploy` | — |

**No es un monolito**: son 8 ECS Services separados (gateway + 6 micro + nats),
cada uno escala y falla por su cuenta. La comunicación es por **NATS** (solo NATS
es descubrible; los micro son consumidores y no exponen puerto).

## Servicios

| Servicio | Tipo | Público | Notas |
|---|---|---|---|
| api-gateway | Load Balanced Web Service | ✅ (ALB) | único con puerto/HTTP público (3100) |
| nats | Backend Service | ❌ | bus de mensajería (puerto 4222) |
| auth/cart/content/payments/products/image | Backend Service | ❌ | consumidores NATS, sin puerto |

## Requisitos previos (infra gestionada — NO la crea Copilot por defecto)

Fargate **no tiene disco persistente (EBS)**, así que lo stateful va gestionado:

1. **RDS MariaDB** (Multi-AZ): crear la instancia y los schemas
   `auth_db, cart_db, content_db, payments_db, image_db` + `ecommerce` (products).
   Apuntar `DATABASE_HOST` (y `_REPLIC` a la réplica de lectura).
2. **ElastiCache (Redis)**: apuntar `REDIS_URL` (lo usan cart y products).
3. **S3**: bucket `ecommerce-images` (imágenes). El acceso va por **Task Role IAM**
   (addon), no por claves.
4. **SQS**: cola `payments-jobs` (payments). También vía Task Role.
5. **ECONT (ERP on-prem, …100.100)**: es **externo a AWS**. products necesita
   conectividad VPC→on-prem (VPN / Direct Connect). Configurar `ECONT_DB_*`.

> Tip: RDS/ElastiCache se pueden crear a mano, con Terraform, o como **addons**
> de Copilot en `copilot/<service>/addons/*.yml` (CloudFormation). Para empezar,
> lo más simple es crearlos a mano y pegar los endpoints en los `manifest.yml`.

## Pasos de despliegue

```bash
# 0) Instalar Copilot y tener credenciales AWS (cuenta real; LocalStack NO sirve para esto)
brew install aws/tap/copilot-cli

# 1) Inicializar la app (una vez). Nombre = <app> usado en el DNS interno.
copilot app init ecommerce

# 2) Crear el entorno (VPC, cluster ECS, etc.). Nombre = <env>.
copilot env init --name dev
copilot env deploy --name dev

# 3) Cargar los secretos (se referencian por nombre en los manifests)
copilot secret init --name JWT_SECRET
copilot secret init --name DATABASE_PASSWORD
copilot secret init --name ECONT_DB_PASSWORD

# 4) Editar cada manifest.yml y reemplazar los REPLACE-* por los endpoints reales
#    (RDS, ElastiCache, ECONT). Ver bloques `variables`.

# 5) Desplegar. NATS primero (los demás se conectan a él); luego los servicios.
copilot svc deploy --name nats --env dev
copilot svc deploy --name auth-service --env dev
copilot svc deploy --name cart-service --env dev
copilot svc deploy --name content-service --env dev
copilot svc deploy --name payments-service --env dev
copilot svc deploy --name products-service --env dev
copilot svc deploy --name image-service --env dev
copilot svc deploy --name api-gateway --env dev   # último: expone el ALB público

# Ver estado / logs / shell
copilot svc status --name products-service --env dev
copilot svc logs --name products-service --env dev --follow
copilot svc exec --name products-service --env dev
```

El `${COPILOT_ENVIRONMENT_NAME}` y `${COPILOT_APPLICATION_NAME}` de los manifests
los resuelve Copilot solo (ej. `nats.dev.ecommerce.local:4222`).

## Pendientes antes de prod (anotados en los manifests)

- **Dockerfiles de prod**: hoy apuntan a `container/Dockerfile.dev` (ts-node, dev).
  Para prod conviene un build transpilado (`nest build` → `node dist`).
- **IAM Task Role**: addons en `copilot/<service>/addons/` para que payments
  acceda a SQS y products/image a S3 (sin claves).
- **NATS HA**: hoy 1 task; para producción, cluster NATS de 3 + JetStream con almacenamiento.

## Dev local

Copilot/ECS es para AWS real. En local seguí usando **docker-compose**
(contenedores + NATS + Redis + MariaDB + LocalStack para S3/SQS). LocalStack
sirve para emular S3/SQS en dev, no para correr ECS.
