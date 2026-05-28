KIND_DEV := ./scripts/kind-dev.sh

.PHONY: dev-build dev-load dev-deploy dev-up dev-status dev-port-forward dev-https dev-localstack

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
