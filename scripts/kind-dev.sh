#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTER_NAME="${KIND_CLUSTER_NAME:-ecommerce-local}"
KUBECTL_NAMESPACE="${KUBECTL_NAMESPACE:-default}"
export KIND_EXPERIMENTAL_PROVIDER="${KIND_EXPERIMENTAL_PROVIDER:-podman}"

SERVICES=(
  "auth-service"
  "cart-service"
  "content-service"
  "image-service"
  "payments-service"
  "products-service"
  "api-gateway"
)

usage() {
  cat <<'EOF'
Usage:
  scripts/kind-dev.sh build [service...]
  scripts/kind-dev.sh load [service...]
  scripts/kind-dev.sh deploy
  scripts/kind-dev.sh restart [service...]
  scripts/kind-dev.sh up [service...]
  scripts/kind-dev.sh status
  scripts/kind-dev.sh logs <service>
  scripts/kind-dev.sh port-forward

Services:
  auth-service cart-service content-service image-service payments-service products-service api-gateway
EOF
}

image_for() {
  local service="$1"
  printf 'localhost/%s:latest' "$service"
}

dockerfile_for() {
  local service="$1"
  case "$service" in
    auth-service) printf 'microservices/auth/container/Dockerfile' ;;
    cart-service) printf 'microservices/cart/container/Dockerfile.dev' ;;
    content-service) printf 'microservices/content/container/Dockerfile.dev' ;;
    image-service) printf 'microservices/image/container/Dockerfile.dev' ;;
    payments-service) printf 'microservices/payments/container/Dockerfile.dev' ;;
    products-service) printf 'microservices/products/container/Dockerfile.dev' ;;
    api-gateway) printf 'api-gateway/container/Dockerfile' ;;
    *) return 1 ;;
  esac
}

manifest_for() {
  local service="$1"
  case "$service" in
    auth-service) printf 'deploy/k8s/dev/auth.yaml' ;;
    cart-service) printf 'deploy/k8s/dev/cart.yaml' ;;
    content-service) printf 'deploy/k8s/dev/content.yaml' ;;
    image-service) printf 'deploy/k8s/dev/image.yaml' ;;
    payments-service) printf 'deploy/k8s/dev/payments.yaml' ;;
    products-service) printf 'deploy/k8s/dev/products.yaml' ;;
    api-gateway) printf 'deploy/k8s/dev/api-gateway.yaml' ;;
    *) return 1 ;;
  esac
}

resolve_services() {
  if [ "$#" -eq 0 ]; then
    printf '%s\n' "${SERVICES[@]}"
    return
  fi

  local requested
  for requested in "$@"; do
    case "$requested" in
      auth|auth-service) printf '%s\n' 'auth-service' ;;
      cart|cart-service) printf '%s\n' 'cart-service' ;;
      content|content-service) printf '%s\n' 'content-service' ;;
      image|image-service) printf '%s\n' 'image-service' ;;
      payments|payments-service) printf '%s\n' 'payments-service' ;;
      products|products-service) printf '%s\n' 'products-service' ;;
      gateway|api-gateway) printf '%s\n' 'api-gateway' ;;
      *)
        printf 'Unknown service: %s\n' "$requested" >&2
        exit 1
        ;;
    esac
  done
}

build_service() {
  local service="$1"
  local dockerfile
  dockerfile="$(dockerfile_for "$service")"
  local image
  image="$(image_for "$service")"

  echo "==> Building ${service} (${image})"
  podman build -t "$image" -f "${ROOT_DIR}/${dockerfile}" "${ROOT_DIR}"
}

load_service() {
  local service="$1"
  local image
  image="$(image_for "$service")"

  echo "==> Loading ${image} into kind:${CLUSTER_NAME}"
  kind load docker-image "$image" --name "$CLUSTER_NAME"
}

restart_service() {
  local service="$1"
  echo "==> Applying ${service}"
  kubectl apply -f "${ROOT_DIR}/$(manifest_for "$service")"
  kubectl rollout restart "deployment/${service}" -n "$KUBECTL_NAMESPACE"
  kubectl rollout status "deployment/${service}" -n "$KUBECTL_NAMESPACE" --timeout=180s
}

deploy_stack() {
  echo "==> Applying dev overlay"
  kubectl apply -k "${ROOT_DIR}/deploy/k8s/dev"
}

status_stack() {
  kubectl get deploy,pods,svc,ingress -n "$KUBECTL_NAMESPACE"
}

show_logs() {
  local service="$1"
  kubectl logs "deployment/${service}" -n "$KUBECTL_NAMESPACE" --tail=200
}

port_forward_gateway() {
  kubectl port-forward -n "$KUBECTL_NAMESPACE" svc/api-gateway 3100:3100 &
  
  kubectl port-forward -n ingress-nginx \
    svc/ingress-nginx-controller 8443:443 &
  
  kubectl port-forward -n "$KUBECTL_NAMESPACE" \
    svc/mariadb 3306:3306 &
}

main() {
  if [ "$#" -eq 0 ]; then
    usage
    exit 1
  fi

  local command="$1"
  shift

  case "$command" in
    build)
      while IFS= read -r service; do
        build_service "$service"
      done < <(resolve_services "$@")
      ;;
    load)
      while IFS= read -r service; do
        load_service "$service"
      done < <(resolve_services "$@")
      ;;
    deploy)
      deploy_stack
      ;;
    restart)
      while IFS= read -r service; do
        restart_service "$service"
      done < <(resolve_services "$@")
      ;;
    up)
      local selected=()
      local service
      while IFS= read -r service; do
        selected+=("$service")
      done < <(resolve_services "$@")
      for service in "${selected[@]}"; do
        build_service "$service"
      done
      for service in "${selected[@]}"; do
        load_service "$service"
      done
      deploy_stack
      for service in "${selected[@]}"; do
        kubectl rollout restart "deployment/${service}" -n "$KUBECTL_NAMESPACE"
      done
      for service in "${selected[@]}"; do
        kubectl rollout status "deployment/${service}" -n "$KUBECTL_NAMESPACE" --timeout=180s
      done
      ;;
    status)
      status_stack
      ;;
    logs)
      if [ "$#" -ne 1 ]; then
        usage
        exit 1
      fi
      show_logs "$(resolve_services "$1")"
      ;;
    port-forward)
      port_forward_gateway
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

main "$@"
