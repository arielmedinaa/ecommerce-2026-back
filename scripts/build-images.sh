#!/bin/bash

set -e

SERVICES=(gateway auth cart content products payments image mail etl)
SELECTED_SERVICES=()
FAILED_SERVICES=()
START_TIME=$(date +%s)

if [ $# -gt 0 ]; then
  SELECTED_SERVICES=("$@")
else
  SELECTED_SERVICES=("${SERVICES[@]}")
fi

export DOCKER_BUILDKIT=1

build_service() {
  local SERVICE=$1

  if [[ "$SERVICE" == "gateway" ]]; then
    SERVICE_MAIN="dist/api-gateway/main.js"
    IMAGE_NAME="ecommerce-gateway"
  else
    SERVICE_MAIN="dist/microservices/${SERVICE}/main.js"
    IMAGE_NAME="ecommerce-${SERVICE}"
  fi

  echo "Building ${IMAGE_NAME}..."

  if docker build \
    --build-arg SERVICE_MAIN="${SERVICE_MAIN}" \
    -t "${IMAGE_NAME}:latest" \
    -f deploy/docker/Dockerfile.prod . > /tmp/${SERVICE}-build.log 2>&1; then
    echo "✅ ${IMAGE_NAME}"
  else
    echo "❌ ${IMAGE_NAME}"
    FAILED_SERVICES+=("$SERVICE")
    cat /tmp/${SERVICE}-build.log | tail -20
  fi
}

for SERVICE in "${SELECTED_SERVICES[@]}"; do
  if [[ " ${SERVICES[@]} " =~ " ${SERVICE} " ]]; then
    build_service "$SERVICE" &
  else
    echo "⚠️  SERVICE '$SERVICE' not recognized, skipping"
  fi
done

wait

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
echo "=========================================="
if [ ${#FAILED_SERVICES[@]} -eq 0 ]; then
  echo "✅ SUCCESS: ${#SELECTED_SERVICES[@]} image(s) built in ${ELAPSED}s"
else
  echo "❌ FAILED: ${#FAILED_SERVICES[@]}/${#SELECTED_SERVICES[@]} - ${FAILED_SERVICES[*]}"
  exit 1
fi
