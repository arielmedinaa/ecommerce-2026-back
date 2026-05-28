#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

helm repo add localstack https://localstack.github.io/helm-charts >/dev/null 2>&1 || true
helm repo update >/dev/null

helm upgrade --install localstack localstack/localstack \
  --namespace localstack \
  --create-namespace \
  -f "${ROOT_DIR}/deploy/k8s/localstack/values-kind.yaml"

kubectl rollout status deployment/localstack -n localstack --timeout=240s

kubectl apply -f "${ROOT_DIR}/deploy/k8s/dev/configmap.yaml"
kubectl rollout restart deployment/payments-service
kubectl rollout status deployment/payments-service --timeout=180s

cat <<EOF
LocalStack ready in namespace localstack.

Service URL from the cluster:
  http://localstack.localstack.svc.cluster.local:4566
EOF
