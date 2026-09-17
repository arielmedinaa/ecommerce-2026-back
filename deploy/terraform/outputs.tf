output "alb_dns_name" {
  description = "DNS público del ALB — este es el punto de entrada de la app una vez desplegada."
  value       = aws_lb.main.dns_name
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "s3_bucket_name" {
  value = aws_s3_bucket.ecommerce_images.bucket
}

output "sqs_queue_url" {
  value = aws_sqs_queue.payments_jobs.url
}

output "cloud_map_namespace" {
  value = aws_service_discovery_private_dns_namespace.internal.name
}
