output "load_balancer_dns_name" {
  value       = aws_lb.web.dns_name
  description = "Staging ALB DNS name."
}

output "ecs_cluster_name" {
  value       = aws_ecs_cluster.main.name
  description = "ECS cluster name."
}

output "ecr_repository_url" {
  value       = aws_ecr_repository.web.repository_url
  description = "Immutable web image repository."
}

output "evidence_bucket_name" {
  value       = aws_s3_bucket.evidence.id
  description = "Private encrypted participant-evidence bucket."
}

output "database_endpoint" {
  value       = aws_db_instance.main.address
  description = "Private RDS endpoint."
  sensitive   = true
}

output "database_master_secret_arn" {
  value       = try(aws_db_instance.main.master_user_secret[0].secret_arn, null)
  description = "AWS-managed RDS master secret ARN."
  sensitive   = true
}

output "alarm_topic_arn" {
  value       = aws_sns_topic.alarms.arn
  description = "Operational alarm topic."
}
