#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TLS_DIR="${ROOT_DIR}/deploy/k8s/dev/certs"
HOSTNAME="api.localhost.localstack.cloud"
SECRET_NAME="api-gateway-tls"
NAMESPACE="${KUBECTL_NAMESPACE:-default}"

mkdir -p "${TLS_DIR}"

if [ ! -f "${TLS_DIR}/${HOSTNAME}.crt" ] || [ ! -f "${TLS_DIR}/${HOSTNAME}.key" ]; then
  openssl req -x509 -nodes -days 365 \
    -newkey rsa:2048 \
    -keyout "${TLS_DIR}/${HOSTNAME}.key" \
    -out "${TLS_DIR}/${HOSTNAME}.crt" \
    -subj "/CN=${HOSTNAME}" \
    -addext "subjectAltName=DNS:${HOSTNAME}"
fi

helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx >/dev/null 2>&1 || true
helm repo update >/dev/null
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  -f "${ROOT_DIR}/deploy/k8s/dev/ingress-nginx-values.yaml"

kubectl create secret tls "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  --cert="${TLS_DIR}/${HOSTNAME}.crt" \
  --key="${TLS_DIR}/${HOSTNAME}.key" \
  --dry-run=client -o yaml | kubectl apply -f -

kubectl apply -f "${ROOT_DIR}/deploy/k8s/dev/ingress.yaml"
kubectl rollout status deployment/ingress-nginx-controller -n ingress-nginx --timeout=180s

cat <<EOF
HTTPS ingress ready.

Run this in another terminal:
  kubectl port-forward -n ingress-nginx svc/ingress-nginx-controller 8443:443

Then open:
  https://${HOSTNAME}:8443
EOF
