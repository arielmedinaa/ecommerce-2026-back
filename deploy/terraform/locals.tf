locals {
  name_prefix = "${var.project_name}-${var.environment}"

  # Puerto que cada servicio anuncia (coincide con SERVICE_PORTS del código y
  # con el EXPOSE de cada Dockerfile.prod). OJO: varios microservicios
  # (cart, content, payments, mail, etl) solo hablan NATS y NO levantan un
  # servidor HTTP en ese puerto — se registra igual en Cloud Map por
  # consistencia con el diagrama, pero no esperes poder pegarle por HTTP
  # hasta que el código de esos servicios agregue un endpoint /health como el
  # que ya tiene products.
  services = {
    api-gateway = {
      repo           = "prod/api-gateway"
      container_port = 3100
      cpu            = 512
      memory         = 1024
      public         = true
      env = {
        GATEWAY_PORT = "3100"
      }
    }
    auth-service = {
      repo           = "prod/auth-service"
      container_port = 3101
      cpu            = 256
      memory         = 512
      public         = false
      env            = {}
    }
    cart-service = {
      repo           = "prod/cart_service"
      container_port = 3102
      cpu            = 256
      memory         = 512
      public         = false
      env            = {}
    }
    content-service = {
      repo           = "prod/content-service"
      container_port = 3103
      cpu            = 256
      memory         = 512
      public         = false
      env            = {}
    }
    payments-service = {
      repo           = "prod/payments_service"
      container_port = 3105
      cpu            = 256
      memory         = 512
      public         = false
      env            = {}
    }
    products-service = {
      repo           = "prod/products-service"
      container_port = 3106
      cpu            = 512
      memory         = 1024
      public         = false
      env            = {}
    }
    image-service = {
      repo           = "prod/image_service"
      container_port = 3107
      cpu            = 256
      memory         = 512
      public         = false
      env = {
        IMAGE_HTTP_PORT = "3107"
      }
    }
    mail-service = {
      repo           = "prod/mail-service"
      container_port = 3108
      cpu            = 256
      memory         = 512
      public         = false
      env            = {}
    }
    etl-service = {
      repo           = "prod/etl-service"
      container_port = 3109
      cpu            = 256
      memory         = 512
      public         = false
      env            = {}
    }
  }

  common_env = {
    NODE_ENV   = "production"
    LOG_FORMAT = "json"
    NATS_URL   = "nats://${local.nats_dns_name}:4222"
    DB_HOST    = var.rds_endpoint
    DB_PORT    = tostring(var.rds_port)
    REDIS_HOST = var.redis_endpoint
    REDIS_PORT = tostring(var.redis_port)
  }

  nats_dns_name = "nats.${var.project_name}.internal"

  ecr_registry = "${var.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
}
