# "AWS Secrets Manager / SSM Parameter Store" del diagrama. Se usa Parameter
# Store (SecureString) en vez de Secrets Manager por costo (SSM es gratis).
# Los valores reales se pasan por terraform.tfvars (nunca commiteado) o -var.

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${local.name_prefix}/jwt-secret"
  type  = "SecureString"
  value = var.jwt_secret

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

resource "aws_ssm_parameter" "mongo_url" {
  name  = "/${local.name_prefix}/mongo-url"
  type  = "SecureString"
  value = var.mongo_url

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

resource "aws_ssm_parameter" "provider_api_jwt_secret" {
  count = var.provider_api_jwt_secret != "" ? 1 : 0

  name  = "/${local.name_prefix}/provider-api-jwt-secret"
  type  = "SecureString"
  value = var.provider_api_jwt_secret

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}
