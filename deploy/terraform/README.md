# Infraestructura ECS Fargate (Terraform)

Arma todo lo que falta del diagrama de arquitectura (`esquemaGrafico-Arquitecture.png`)
sobre lo que **ya existe** en la cuenta `286879406751` (VPC `jjconsulting-vpc`,
RDS MariaDB, ElastiCache Redis — todos referenciados por id/endpoint, no se
recrean ni se modifican).

## Qué crea

- Cluster ECS Fargate
- 9 servicios (api-gateway + 8 microservicios) + NATS/JetStream, cada uno con su
  task definition (imagen = la que ya está en ECR, tag `:latest`)
- ALB público + target group + listener (solo `api-gateway` queda expuesto)
- Cloud Map (namespace `ecommerce2026.internal`) para descubrimiento interno
- Security groups nuevos + reglas de acceso hacia los SG existentes de RDS/Redis
- Bucket S3 (`ecommerce-images`) y cola SQS (`payments-jobs`) — hoy no existe
  ninguno de los dos en la cuenta
- Log groups en CloudWatch, uno por servicio
- Parámetros SecureString en SSM para `JWT_SECRET` / `MONGO_URL`
- Roles IAM (`ecs-task-execution-role`, `ecs-task-role`) — **ver bloqueo abajo**

## Bloqueo conocido: permisos IAM

Tu usuario SSO (`jj-emprendimientos-dev`) no tiene `iam:CreateRole`. Todo el
resto de este plan se puede aplicar hoy; `iam.tf` va a fallar hasta que:

1. Alguien con más permisos corra el `apply` completo, o
2. Te den `iam:CreateRole` + `iam:PassRole` acotado a recursos con prefijo
   `ecommerce2026-prod-*` (así no te dan admin total de IAM).

Mientras tanto podés aplicar todo MENOS los servicios/roles con:

```bash
terraform apply -target=aws_ecs_cluster.main \
  -target=aws_s3_bucket.ecommerce_images \
  -target=aws_sqs_queue.payments_jobs \
  -target=aws_security_group.alb \
  -target=aws_security_group.ecs_tasks \
  -target=aws_lb.main \
  -target=aws_service_discovery_private_dns_namespace.internal
```

Las tasks/servicios (`aws_ecs_service`, `aws_ecs_task_definition`) necesitan
los roles IAM para poder correr, así que esos quedan para el `apply` final.

## Cómo aplicar (una vez con los permisos)

```bash
cd deploy/terraform
cp terraform.tfvars.example terraform.tfvars   # completar con secretos reales
terraform init
terraform plan
terraform apply
```

## Pendiente a nivel de código de la app (no es infra)

- `cart`, `content`, `payments`, `mail`, `etl` no levantan servidor HTTP (solo
  hablan NATS) — no tienen `/health`. Si más adelante se quiere que el ALB o
  ECS chequeen su salud por HTTP, hay que agregarles un endpoint como el que
  ya tiene `products` (`controller/health.controller.ts`).
- Los puertos HTTP hardcodeados en `auth` (3001) y `products` (4000) no
  coinciden con `SERVICE_PORTS` (3101/3106). No se tocó ese código — Cloud Map
  registra igual las tasks, pero cualquier chequeo de salud HTTP debe apuntar
  al puerto real que cada servicio escucha.
