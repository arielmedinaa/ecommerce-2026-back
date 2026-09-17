# ============================================================================
# BLOQUEADO: tu usuario SSO (jj-emprendimientos-dev) no tiene iam:CreateRole.
# Este archivo queda escrito y listo, pero `terraform apply` va a fallar acá
# hasta que alguien con más permisos lo aplique (o te den iam:CreateRole +
# iam:PassRole acotado a "ecommerce2026-prod-*").
# ============================================================================

data "aws_iam_policy_document" "ecs_tasks_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

# Rol de EJECUCION: usado por el agente de ECS para bajar la imagen de ECR y
# mandar logs a CloudWatch. No da permisos a tu código de aplicación.
resource "aws_iam_role" "ecs_task_execution" {
  name               = "${local.name_prefix}-ecs-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_managed" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Rol de TASK: usado por el código de la app en runtime (S3, SQS). Es el que
# se referencia en el diagrama como "AWS IAM (Task Roles y Permisos)".
resource "aws_iam_role" "ecs_task" {
  name               = "${local.name_prefix}-ecs-task-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume_role.json

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

data "aws_iam_policy_document" "ecs_task_permissions" {
  statement {
    sid    = "S3EcommerceImages"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.ecommerce_images.arn,
      "${aws_s3_bucket.ecommerce_images.arn}/*",
    ]
  }

  statement {
    sid    = "SQSPaymentsJobs"
    effect = "Allow"
    actions = [
      "sqs:SendMessage",
      "sqs:ReceiveMessage",
      "sqs:DeleteMessage",
      "sqs:GetQueueAttributes",
    ]
    resources = [
      aws_sqs_queue.payments_jobs.arn,
      aws_sqs_queue.payments_jobs_dlq.arn,
    ]
  }

  statement {
    sid    = "SSMParameters"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:GetParameters",
      "ssm:GetParametersByPath",
    ]
    resources = ["arn:aws:ssm:${var.aws_region}:${var.account_id}:parameter/${local.name_prefix}/*"]
  }
}

resource "aws_iam_role_policy" "ecs_task_permissions" {
  name   = "${local.name_prefix}-ecs-task-permissions"
  role   = aws_iam_role.ecs_task.id
  policy = data.aws_iam_policy_document.ecs_task_permissions.json
}
