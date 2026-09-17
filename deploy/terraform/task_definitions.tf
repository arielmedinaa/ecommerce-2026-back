resource "aws_ecs_task_definition" "services" {
  for_each = local.services

  family                   = "${local.name_prefix}-${each.key}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = tostring(each.value.cpu)
  memory                   = tostring(each.value.memory)
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = each.key
      image     = "${local.ecr_registry}/${each.value.repo}:latest"
      essential = true

      portMappings = [
        { containerPort = each.value.container_port, protocol = "tcp" }
      ]

      environment = [
        for k, v in merge(local.common_env, each.value.env) : { name = k, value = v }
      ]

      secrets = concat(
        [
          { name = "JWT_SECRET", valueFrom = aws_ssm_parameter.jwt_secret.arn },
          { name = "MONGO_URL", valueFrom = aws_ssm_parameter.mongo_url.arn },
        ],
        var.provider_api_jwt_secret != "" ? [
          { name = "PROVIDER_API_JWT_SECRET", valueFrom = aws_ssm_parameter.provider_api_jwt_secret[0].arn }
        ] : []
      )

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.services[each.key].name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = each.key
        }
      }
    }
  ])

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
    Service     = each.key
  }
}
