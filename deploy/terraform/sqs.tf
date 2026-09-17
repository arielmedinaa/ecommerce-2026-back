# Cola para trabajos asíncronos de pagos, referenciada en el diagrama como
# "Amazon SQS (payments-jobs)". No existe ninguna cola en la cuenta todavía.

resource "aws_sqs_queue" "payments_jobs_dlq" {
  name                      = "${local.name_prefix}-payments-jobs-dlq"
  message_retention_seconds = 1209600 # 14 días

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

resource "aws_sqs_queue" "payments_jobs" {
  name                       = "${local.name_prefix}-payments-jobs"
  visibility_timeout_seconds = 60
  message_retention_seconds  = 345600 # 4 días

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payments_jobs_dlq.arn
    maxReceiveCount     = 5
  })

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}
