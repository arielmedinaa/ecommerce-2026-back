# LocalStack + SQS (Payments)

## Objetivo
Probar una cola tipo AWS SQS de forma local (sin AWS) para empezar a desacoplar procesos críticos de `payments`.

## Requisitos
- Docker Compose (usando `deploy/docker-compose-all-services.yml`)

## Variables de entorno
- `SQS_ENDPOINT` (default en compose): `http://localstack:4566`
- `AWS_REGION` (default): `us-east-1`
- `PAYMENTS_SQS_QUEUE_NAME` (default): `payments-jobs`
- `PAYMENTS_SQS_WORKER_ENABLED` (default): `true`
- `PSP_SIMULATE_FAILURE` (default): `false`
- `PSP_MAX_RETRIES` (default): `5`
- `PSP_RETRY_DELAY_MS` (default): `5000`

## Qué hace el servicio de payments
- Cuando se ejecuta `registrar_pago`, además de guardar el pago en DB, encola un mensaje SQS:
  - Crea `intentos_pago` (estado `creado`)
  - Encola `{ type: "payment_intent_created", idIntentoPago, ts }`
- El worker:
  - Marca `intentos_pago` como `procesando`
  - Si `PSP_SIMULATE_FAILURE=true`, reintenta encolando de nuevo con backoff hasta `PSP_MAX_RETRIES`
  - Si no falla, marca `intentos_pago` como `completado` y recién ahí inserta en `pagos`

## Notas
- Esto es la base para implementar **Outbox + reintentos + DLQ** cuando se integre un PSP real.
