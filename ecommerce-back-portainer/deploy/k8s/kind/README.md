# Kind (local) - ecommerce

Este directorio es un **overlay local** para correr los microservicios en el cluster `kind-ecommerce-local` (usando Podman).

> Nota: **Karpenter NO aplica en Kind**. Karpenter es para **EKS/AWS** porque aprovisiona nodos EC2. Para producción usar `deploy/k8s/prod` + `deploy/k8s/karpenter` en un cluster EKS real.

## 1) Requisitos
- `kubectl`
- `kind` (provider podman)
- Cluster creado: `kind-ecommerce-local`

## 2) Cargar imágenes locales a Kind
Estos manifests usan `imagePullPolicy: Never`, por lo que las imágenes deben existir dentro del nodo Kind.

Ejemplo (repetir por cada imagen que uses):
```bash
export KIND_EXPERIMENTAL_PROVIDER=podman
kind load docker-image api-gateway-dev:latest --name ecommerce-local
kind load docker-image auth-service-dev:latest --name ecommerce-local
kind load docker-image cart-service-dev:latest --name ecommerce-local
kind load docker-image content-service-dev:latest --name ecommerce-local
kind load docker-image image-service-dev:latest --name ecommerce-local
kind load docker-image payments-service-dev:latest --name ecommerce-local
kind load docker-image products-service-dev:latest --name ecommerce-local
```

## 3) Despliegue
```bash
kubectl apply -f deploy/k8s/kind/namespace.yaml
kubectl apply -f deploy/k8s/kind/configmap.yaml
kubectl apply -f deploy/k8s/kind/localstack.yaml
kubectl apply -f deploy/k8s/kind/services.yaml
```

## 4) Acceso al API Gateway
Recomendado en Kind: port-forward
```bash
kubectl -n ecommerce-kind port-forward svc/api-gateway 3100:3100
```

Luego:
- `http://localhost:3100/api/docs`

