#!/usr/bin/env bash
# Expone el api-gateway en TODAS las interfaces (0.0.0.0) para que el storefront
# sea accesible desde la LAN (mobile), no solo desde localhost.
#
# - Bindea 0.0.0.0:3100 -> svc/api-gateway:3100 (0.0.0.0 también sirve a localhost).
# - Loop de reconexión: si el pod se reinicia o se cae la conexión, reintenta.
# - Mata cualquier forward previo del gateway atado solo a 127.0.0.1 para evitar
#   el conflicto de puerto.
#
# Uso: ./scripts/expose-backend.sh   (dejalo corriendo en una terminal)

set -u
NS="default"
SVC="svc/api-gateway"
PORT="3100"

echo "Exponiendo $SVC en 0.0.0.0:$PORT (Ctrl+C para detener)..."
while true; do
  # Liberar el puerto si otro forward (localhost-only) lo tomó.
  pkill -f "port-forward.*${SVC} ${PORT}:${PORT}" 2>/dev/null
  sleep 1
  kubectl port-forward --address 0.0.0.0 -n "$NS" "$SVC" "${PORT}:${PORT}"
  echo "[expose-backend] conexión caída, reintentando en 2s..."
  sleep 2
done
