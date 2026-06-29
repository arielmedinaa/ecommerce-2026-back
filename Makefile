KIND_DEV := ./scripts/kind-dev.sh
COMPOSE := docker compose -f deploy/docker-compose-all-services.yml

.PHONY: dev-build dev-load dev-deploy dev-up dev-status dev-port-forward dev-https dev-localstack \
        compose-up compose-down compose-logs compose-seed

# --- Entorno local con docker-compose (espejo de ECS Fargate) ---
compose-up:
	$(COMPOSE) up --build

compose-down:
	$(COMPOSE) down

compose-logs:
	$(COMPOSE) logs -f

# Regenera el seed de datos desde el cluster kind (snapshot). Luego: compose-down -v + compose-up.
compose-seed:
	./scripts/export-seed-from-kind.sh

dev-build:
	$(KIND_DEV) build

dev-load:
	$(KIND_DEV) load

dev-deploy:
	$(KIND_DEV) deploy

dev-up:
	$(KIND_DEV) up

dev-status:
	$(KIND_DEV) status

dev-port-forward:
	$(KIND_DEV) port-forward

dev-https:
	./scripts/setup-dev-https.sh

dev-localstack:
	./scripts/setup-localstack.sh
