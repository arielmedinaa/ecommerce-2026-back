# Bus de mensajeria NATS + JetStream. Misma config que ya usan en
# deploy/k8s/prod/nats.yaml (imagen oficial, sin persistencia todavia — un
# solo nodo, sin cluster de 3 nodos con storage; suficiente para arrancar).

resource "aws_ecs_task_definition" "nats" {
  family                   = "${local.name_prefix}-nats"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "nats"
      image     = "nats:2.10-alpine"
      essential = true
      command   = ["-js", "-m", "8222", "--max_payload", "8388608"]
      portMappings = [
        { containerPort = 4222, protocol = "tcp" },
        { containerPort = 8222, protocol = "tcp" },
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.nats.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = "nats"
        }
      }
    }
  ])

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

resource "aws_ecs_service" "nats" {
  name            = "nats"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.nats.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  service_registries {
    registry_arn = aws_service_discovery_service.nats.arn
  }

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}
