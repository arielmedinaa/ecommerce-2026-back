resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb-sg"
  description = "Trafico publico hacia el ALB (unico punto de entrada)"
  vpc_id      = var.vpc_id

  ingress {
    description = "HTTP publico"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS publico"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

resource "aws_security_group" "ecs_tasks" {
  name        = "${local.name_prefix}-ecs-tasks-sg"
  description = "Trafico entre las tasks de Fargate (NATS, HTTP interno del gateway) y hacia RDS/Redis"
  vpc_id      = var.vpc_id

  # Todo el trafico interno entre tasks del propio SG (NATS, HTTP interno)
  ingress {
    description = "Trafico interno entre microservicios"
    from_port   = 0
    to_port     = 65535
    protocol    = "tcp"
    self        = true
  }

  # El ALB puede llegar al api-gateway
  ingress {
    description     = "ALB hacia api-gateway"
    from_port       = 3100
    to_port         = 3100
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

# Autoriza a las tasks de ECS a conectarse a los security groups EXISTENTES
# de RDS y Redis (no se tocan esos SGs, solo se les agrega una regla nueva).

resource "aws_security_group_rule" "ecs_to_rds" {
  type                     = "ingress"
  from_port                = var.rds_port
  to_port                  = var.rds_port
  protocol                 = "tcp"
  security_group_id        = var.rds_security_group_id
  source_security_group_id = aws_security_group.ecs_tasks.id
  description              = "ECS Fargate hacia RDS MariaDB"
}

resource "aws_security_group_rule" "ecs_to_redis" {
  type                     = "ingress"
  from_port                = var.redis_port
  to_port                  = var.redis_port
  protocol                 = "tcp"
  security_group_id        = var.redis_security_group_id
  source_security_group_id = aws_security_group.ecs_tasks.id
  description              = "ECS Fargate hacia ElastiCache Redis"
}
