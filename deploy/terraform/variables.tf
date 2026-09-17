variable "aws_region" {
  description = "Región donde vive toda la infra existente (VPC, RDS, Redis, ECR)."
  type        = string
  default     = "sa-east-1"
}

variable "account_id" {
  description = "Cuenta AWS donde se despliega (usada para armar URIs de ECR)."
  type        = string
  default     = "286879406751"
}

variable "environment" {
  description = "Nombre del environment, usado como prefijo/tag en todos los recursos nuevos."
  type        = string
  default     = "prod"
}

variable "project_name" {
  description = "Prefijo corto para nombrar recursos nuevos (cluster, SGs, ALB, etc.)."
  type        = string
  default     = "ecommerce2026"
}

# --- Recursos EXISTENTES (no se crean, solo se referencian por id) ---

variable "vpc_id" {
  description = "VPC existente (jjconsulting-vpc)."
  type        = string
  default     = "vpc-0c2e4dee7b74a9f00"
}

variable "public_subnet_ids" {
  description = "Subnets públicas existentes, para el ALB."
  type        = list(string)
  default     = ["subnet-0e075400c4d5ecf68", "subnet-00f79b642cad45049"]
}

variable "private_subnet_ids" {
  description = "Subnets privadas existentes, donde corren las tasks de Fargate."
  type        = list(string)
  default     = ["subnet-06f0e599184d0c25e", "subnet-0c48793511a313df1", "subnet-0a29928549a41362f"]
}

variable "rds_security_group_id" {
  description = "Security group existente de RDS (jjconsulting-db-sg), para autorizar acceso desde ECS."
  type        = string
  default     = "sg-0b5978db5e204f170"
}

variable "redis_security_group_id" {
  description = "Security group existente de ElastiCache (jjconsulting-elasticache-sg), para autorizar acceso desde ECS."
  type        = string
  default     = "sg-06e28c7a3c6e380cd"
}

variable "rds_endpoint" {
  description = "Endpoint del RDS MariaDB existente."
  type        = string
  default     = "jjconsulting.c5e82o4ee48p.sa-east-1.rds.amazonaws.com"
}

variable "rds_port" {
  type    = number
  default = 3306
}

variable "redis_endpoint" {
  description = "Endpoint del nodo primario de ElastiCache Redis existente."
  type        = string
  default     = "jjconsulting-elasticache-redis7-001.jjconsulting-elasticache-redis7.jezyiw.sae1.cache.amazonaws.com"
}

variable "redis_port" {
  type    = number
  default = 6379
}

# --- Secretos (no tienen default a propósito: pasarlos por terraform.tfvars,
# que NUNCA se commitea, o por -var en el apply) ---

variable "jwt_secret" {
  description = "Secreto para firmar JWT, compartido por todos los servicios."
  type        = string
  sensitive   = true
}

variable "mongo_url" {
  description = "Connection string de MongoDB (products/content usan Mongoose)."
  type        = string
  sensitive   = true
}

variable "provider_api_jwt_secret" {
  description = "Secreto JWT específico del portal de proveedores (products-service)."
  type        = string
  sensitive   = true
  default     = ""
}
