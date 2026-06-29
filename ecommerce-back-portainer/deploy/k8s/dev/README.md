# Perfil dev para Kind

Este perfil `dev` usa:

- imágenes locales con tag `localhost/<service>:latest`
- `imagePullPolicy: Never`
- manifests de `deploy/k8s/dev`
- MariaDB local dentro del cluster
- arranque en modo desarrollo (`ts-node`)

## Requisitos

- `podman`
- `kind`
- `kubectl`
- cluster `kind-ecommerce-local`

## Flujo recomendado

Desde la raíz del repo:

```bash
chmod +x scripts/kind-dev.sh
make dev-up
```

Eso hace:

1. build de las imágenes dev
2. `kind load docker-image ...`
3. `kubectl apply -k deploy/k8s/dev`
4. restart y espera del rollout

## Comandos útiles

```bash
make dev-status
./scripts/kind-dev.sh logs auth-service
./scripts/kind-dev.sh up auth-service
./scripts/kind-dev.sh up api-gateway
make dev-port-forward
make dev-https
make dev-localstack
```

Swagger del gateway:

- `http://localhost:3100/api/docs`

HTTPS del gateway:

- ejecuta `make dev-https`
- luego `kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8443:443`
- abre `https://api.localhost.localstack.cloud:8443/api/docs`

## Nota sobre ingress

El manifest `deploy/k8s/dev/ingress.yaml` queda incluido en el overlay. En Kind, como el nodo no expone `443` al host por defecto, el acceso HTTPS recomendado es por `port-forward` del servicio `ingress-nginx-controller`.

## LocalStack

Para levantar LocalStack dentro del cluster:

```bash
make dev-localstack
```

Servicios habilitados en este perfil:

- `s3`
- `sqs`
- `cloudfront`
- `iam`
- `sts`
