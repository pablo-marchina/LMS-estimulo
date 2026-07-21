resource "aws_sns_topic" "alarms" {
  name              = "${local.name_prefix}-alarms"
  kms_master_key_id = aws_kms_key.platform.arn
}

resource "aws_sns_topic_subscription" "alarm_email" {
  count     = var.alarm_email == "" ? 0 : 1
  topic_arn = aws_sns_topic.alarms.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${local.name_prefix}-alb-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 5
  treat_missing_data  = "notBreaching"
  dimensions          = { LoadBalancer = aws_lb.web.arn_suffix }
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name          = "${local.name_prefix}-database-storage"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 2
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 5368709120
  treat_missing_data  = "missing"
  dimensions          = { DBInstanceIdentifier = aws_db_instance.main.identifier }
  alarm_actions       = [aws_sns_topic.alarms.arn]
}

resource "aws_route53_record" "web" {
  count   = local.route53_enabled ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.web.dns_name
    zone_id                = aws_lb.web.zone_id
    evaluate_target_health = true
  }
}
