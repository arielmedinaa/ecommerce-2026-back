#!/usr/bin/env bash
# Genera el seed de datos para el MariaDB local del docker-compose, tomándolo del
# cluster kind actual (que ya tiene los schemas con datos). Snapshot puntual.
#
# Uso: ./scripts/export-seed-from-kind.sh
# Resultado: deploy/local/init/02-seed.sql  (MariaDB lo carga en el primer `compose up`).
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${ROOT_DIR}/deploy/local/init/02-seed.sql"
NS="${KUBECTL_NAMESPACE:-default}"

echo "==> Exportando schemas desde el MariaDB de kind..."
kubectl exec -n "$NS" deploy/mariadb -- sh -c \
  'mysqldump -uroot -proot --databases auth_db cart_db content_db payments_db image_db ecommerce \
   --no-tablespaces --skip-lock-tables 2>/dev/null' > "$OUT"

echo "==> Seed escrito en: $OUT ($(wc -l < "$OUT") líneas)"
echo "    Borrá el volumen y relevantá para recargarlo:"
echo "    docker compose -f deploy/docker-compose-all-services.yml down -v && make compose-up"
