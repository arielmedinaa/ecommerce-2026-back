#!/bin/bash
#
# Ultra-fast K8s deployment: build + export + parallel transfer + import + rollout
# Target: < 60 seconds total
#
# Usage: ./deploy-k8s-fast.sh [services...]
#   ./deploy-k8s-fast.sh gateway products
#   ./deploy-k8s-fast.sh products
#   ./deploy-k8s-fast.sh (all services)

set -e

# ============================================================================
# CONFIG
# ============================================================================

CONTROL_PLANE="198.211.104.197"
WORKER_1="143.244.166.116"
WORKER_2="67.205.169.13"
SSH_USER="root"
SSH_PASS="${SSH_PASS:-A2468b2402}"
REMOTE_ROOT="/opt/ecommerce/ecommerce-back-portainer"

SERVICES=(gateway auth cart content products payments image mail etl)
SERVICES_TO_DEPLOY=()
FAILED_SERVICES=()

START_TIME=$(date +%s)

# ============================================================================
# PARSE ARGS
# ============================================================================

if [ $# -gt 0 ]; then
  SERVICES_TO_DEPLOY=("$@")
else
  SERVICES_TO_DEPLOY=("${SERVICES[@]}")
fi

# Validate services
for svc in "${SERVICES_TO_DEPLOY[@]}"; do
  if [[ ! " ${SERVICES[@]} " =~ " ${svc} " ]]; then
    echo "❌ Unknown service: $svc"
    exit 1
  fi
done

echo "🚀 Deploying: ${SERVICES_TO_DEPLOY[*]}"
echo "   Control-plane: $CONTROL_PLANE"
echo "   Workers: $WORKER_1, $WORKER_2"
echo ""

# ============================================================================
# PHASE 1: SYNC CODE (local machines first, then to remote if needed)
# ============================================================================

echo "📦 Phase 1: Sync code to control-plane..."

SSH_CMD="ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ConnectTimeout=10"
SCP_CMD="scp -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ConnectTimeout=10"
RSYNC_CMD="rsync -az -e \"ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ConnectTimeout=10\""

SYNC_RET=0
for entry in package.json package-lock.json yarn.lock nest-cli.json tsconfig.json tsconfig.prod.json tsconfig.paths.json .swcrc .swcrc.prod api-gateway microservices shared deploy; do
  SSHPASS="$SSH_PASS" sshpass -e rsync -az \
    -e "ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no -o ConnectTimeout=10" \
    --exclude 'node_modules' --exclude 'dist' --exclude '.git' \
    "./$entry" "$SSH_USER@$CONTROL_PLANE:$REMOTE_ROOT/" || SYNC_RET=1
done

if [ $SYNC_RET -ne 0 ]; then
  echo "❌ rsync to control-plane failed. Aborting."
  exit 1
fi
echo "   Synced local working tree -> $CONTROL_PLANE:$REMOTE_ROOT"

echo "✅ Code synced"
echo ""

# ============================================================================
# PHASE 2: BUILD IMAGES IN PARALLEL (45-60s with SWC+BuildKit)
# ============================================================================

echo "🔨 Phase 2: Building images in parallel..."
echo "   Services: ${SERVICES_TO_DEPLOY[*]}"

BUILD_SCRIPT="/tmp/build-$$.sh"
cat > "$BUILD_SCRIPT" << 'BSCRIPT'
#!/bin/bash
set -e
export DOCKER_BUILDKIT=1

cd /opt/ecommerce/ecommerce-back-portainer

SERVICES=("$@")
FAILED=()

build_service() {
  local SVC=$1
  if [[ "$SVC" == "gateway" ]]; then
    SERVICE_MAIN="dist/api-gateway/main.js"
    IMAGE="ecommerce-gateway"
  else
    SERVICE_MAIN="dist/microservices/${SVC}/main.js"
    IMAGE="ecommerce-${SVC}"
  fi

  if timeout 300 podman build \
    --network=host \
    --build-arg SERVICE_MAIN="$SERVICE_MAIN" \
    -t "$IMAGE:latest" \
    -f deploy/docker/Dockerfile.prod . \
    > /tmp/build-${SVC}.log 2>&1; then
    echo "✅ $IMAGE"
  else
    echo "❌ $IMAGE"
    tail -10 /tmp/build-${SVC}.log >&2
    echo "$SVC" >> /tmp/failed-services.txt
  fi
}

for SVC in "${SERVICES[@]}"; do
  build_service "$SVC" &
done
wait

if [ -f /tmp/failed-services.txt ]; then
  echo "Build failed for: $(cat /tmp/failed-services.txt)"
  exit 1
fi
BSCRIPT

chmod +x "$BUILD_SCRIPT"

# Run build on control-plane
SSHPASS="$SSH_PASS" sshpass -e $SSH_CMD $SSH_USER@$CONTROL_PLANE bash -s "${SERVICES_TO_DEPLOY[@]}" < "$BUILD_SCRIPT"
RET=$?
rm -f "$BUILD_SCRIPT"

if [ $RET -ne 0 ]; then
  echo "❌ Build failed"
  exit 1
fi

BUILD_TIME=$(($(date +%s) - START_TIME))
echo "✅ Build complete in ${BUILD_TIME}s"
echo ""

# ============================================================================
# PHASE 3: EXPORT, COMPRESS & TRANSFER IN PARALLEL (20-30s)
# ============================================================================

echo "📤 Phase 3: Export, compress & transfer in parallel..."

# Export and compress on control-plane, transfer to workers in parallel
EXPORT_SCRIPT="/tmp/export-$$.sh"
cat > "$EXPORT_SCRIPT" << 'ESCRIPT'
#!/bin/bash
set -e
cd /opt/ecommerce/ecommerce-back-portainer

for SVC in "$@"; do
  if [[ "$SVC" == "gateway" ]]; then
    IMAGE="ecommerce-gateway"
  else
    IMAGE="ecommerce-${SVC}"
  fi

  echo "Exporting $IMAGE..."
  podman save "$IMAGE:latest" | gzip > /tmp/${SVC}.tar.gz
done
ESCRIPT

chmod +x "$EXPORT_SCRIPT"

# Run export on control-plane
SSHPASS="$SSH_PASS" sshpass -e $SSH_CMD $SSH_USER@$CONTROL_PLANE bash -s "${SERVICES_TO_DEPLOY[@]}" < "$EXPORT_SCRIPT"
rm -f "$EXPORT_SCRIPT"

# Transfer in parallel to all 3 nodes (control-plane already has it)
transfer_and_import() {
  local NODE=$1
  local SERVICES_LIST="$2"

  for SVC in $SERVICES_LIST; do
    echo "  → $NODE: transferring $SVC..."
    SSHPASS="$SSH_PASS" sshpass -e $SCP_CMD \
      $SSH_USER@$CONTROL_PLANE:/tmp/${SVC}.tar.gz \
      /tmp/${SVC}.tar.gz 2>/dev/null || true
  done
}

# Transfer to workers in parallel
transfer_and_import "$WORKER_1" "${SERVICES_TO_DEPLOY[*]}" &
PID_W1=$!

transfer_and_import "$WORKER_2" "${SERVICES_TO_DEPLOY[*]}" &
PID_W2=$!

wait $PID_W1 $PID_W2 2>/dev/null || true

echo "✅ Export & transfer complete"
echo ""

# ============================================================================
# PHASE 4: IMPORT ON ALL 3 NODES IN PARALLEL (10-15s)
# ============================================================================

echo "📥 Phase 4: Import images on all nodes in parallel..."

IMPORT_SCRIPT="/tmp/import-$$.sh"
cat > "$IMPORT_SCRIPT" << 'ISCRIPT'
#!/bin/bash
set -e

for TAR in /tmp/*.tar.gz; do
  [ -f "$TAR" ] || continue
  SVC=$(basename "$TAR" .tar.gz)

  echo "Importing $SVC..."
  zcat "$TAR" | ctr -n k8s.io images import -

  # Re-tag for K8s manifests
  if [[ "$SVC" == "gateway" ]]; then
    IMAGE="ecommerce-gateway"
  else
    IMAGE="ecommerce-${SVC}"
  fi

  ctr -n k8s.io images tag localhost/$IMAGE:latest docker.io/library/$IMAGE:latest 2>/dev/null || true
  ctr -n k8s.io images tag docker.io/library/$IMAGE:latest $IMAGE:latest 2>/dev/null || true
done
ISCRIPT

chmod +x "$IMPORT_SCRIPT"

# Import on control-plane
echo "  → control-plane: importing..."
SSHPASS="$SSH_PASS" sshpass -e $SSH_CMD $SSH_USER@$CONTROL_PLANE bash < "$IMPORT_SCRIPT" &
PID_CP=$!

# Import on worker-1
echo "  → worker-1: importing..."
SSHPASS="$SSH_PASS" sshpass -e bash -c "cat $IMPORT_SCRIPT | ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no $SSH_USER@$WORKER_1 'bash'" &
PID_W1=$!

# Import on worker-2
echo "  → worker-2: importing..."
SSHPASS="$SSH_PASS" sshpass -e bash -c "cat $IMPORT_SCRIPT | ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no $SSH_USER@$WORKER_2 'bash'" &
PID_W2=$!

wait $PID_CP $PID_W1 $PID_W2 2>/dev/null || true
rm -f "$IMPORT_SCRIPT"

echo "✅ Import complete"
echo ""

# ============================================================================
# PHASE 5: ROLLOUT & VERIFY (10-15s)
# ============================================================================

echo "🔄 Phase 5: Rollout and verify..."

ROLLOUT_SCRIPT="/tmp/rollout-$$.sh"
cat > "$ROLLOUT_SCRIPT" << 'RSCRIPT'
#!/bin/bash

for SVC in "$@"; do
  if [[ "$SVC" == "gateway" ]]; then
    DEPLOY="api-gateway"
  else
    DEPLOY="$SVC"
  fi

  echo "Restarting $DEPLOY..."
  kubectl rollout restart deployment/$DEPLOY --namespace ecommerce-prod 2>/dev/null || \
  kubectl rollout restart deployment/$DEPLOY --namespace default 2>/dev/null || \
  kubectl rollout restart deployment/$DEPLOY 2>/dev/null || true
done

# Wait for all rollouts
for SVC in "$@"; do
  if [[ "$SVC" == "gateway" ]]; then
    DEPLOY="api-gateway"
  else
    DEPLOY="$SVC"
  fi

  kubectl rollout status deployment/$DEPLOY --timeout=30s 2>/dev/null || true
done
RSCRIPT

chmod +x "$ROLLOUT_SCRIPT"

SSHPASS="$SSH_PASS" sshpass -e $SSH_CMD $SSH_USER@$CONTROL_PLANE bash -s "${SERVICES_TO_DEPLOY[@]}" < "$ROLLOUT_SCRIPT"
rm -f "$ROLLOUT_SCRIPT"

echo "✅ Rollout complete"
echo ""

# ============================================================================
# PHASE 6: HEALTH CHECK (5-10s)
# ============================================================================

echo "🏥 Phase 6: Health check..."

HEALTH_SCRIPT="/tmp/health-$$.sh"
cat > "$HEALTH_SCRIPT" << 'HSCRIPT'
#!/bin/bash

for i in {1..5}; do
  echo "Health check attempt $i/5..."

  if curl -s http://localhost/api/health 2>/dev/null | grep -q '"status":"ok"\|"status":"UP"'; then
    echo "✅ API healthy"
    exit 0
  fi

  sleep 2
done

echo "⚠️  Health check timed out (API may still be warming up)"
HSCRIPT

chmod +x "$HEALTH_SCRIPT"

SSHPASS="$SSH_PASS" sshpass -e $SSH_CMD $SSH_USER@$CONTROL_PLANE bash < "$HEALTH_SCRIPT" || true
rm -f "$HEALTH_SCRIPT"

echo "✅ Health check complete"
echo ""

# ============================================================================
# CLEANUP
# ============================================================================

echo "🧹 Cleanup..."

CLEANUP_SCRIPT="/tmp/cleanup-$$.sh"
cat > "$CLEANUP_SCRIPT" << 'CSCRIPT'
#!/bin/bash
rm -f /tmp/*.tar.gz /tmp/*.tar /tmp/build-*.log 2>/dev/null || true
df -h / | tail -1
CSCRIPT

chmod +x "$CLEANUP_SCRIPT"

echo "  → control-plane: cleaning..."
SSHPASS="$SSH_PASS" sshpass -e $SSH_CMD $SSH_USER@$CONTROL_PLANE bash < "$CLEANUP_SCRIPT" &

echo "  → worker-1: cleaning..."
SSHPASS="$SSH_PASS" sshpass -e $SSH_CMD $SSH_USER@$WORKER_1 bash < "$CLEANUP_SCRIPT" &

echo "  → worker-2: cleaning..."
SSHPASS="$SSH_PASS" sshpass -e $SSH_CMD $SSH_USER@$WORKER_2 bash < "$CLEANUP_SCRIPT" &

wait
rm -f "$CLEANUP_SCRIPT"

echo "✅ Cleanup complete"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================

TOTAL_TIME=$(($(date +%s) - START_TIME))
echo "=========================================="
echo "✅ DEPLOY SUCCESSFUL"
echo "=========================================="
echo "Services: ${SERVICES_TO_DEPLOY[*]}"
echo "Total time: ${TOTAL_TIME}s"
echo ""
echo "Next: Verify /api/health and test product matching endpoints"
