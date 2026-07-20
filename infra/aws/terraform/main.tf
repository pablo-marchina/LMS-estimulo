data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" { state = "available" }
data "aws_partition" "current" {}

locals {
  name_prefix = "${var.project_name}-${var.environment}"
  azs         = slice(data.aws_availability_zones.available.names, 0, 2)
  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
    DataClass   = "confidential"
  }
  required_secret_keys = toset([
    "NEXT_PUBLIC_APP_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY"
  ])
  route53_enabled = var.domain_name != "" && var.route53_zone_id != ""
}

resource "terraform_data" "deployment_guard" {
  input = {
    account_id  = data.aws_caller_identity.current.account_id
    region      = var.aws_region
    environment = var.environment
    image       = var.container_image
  }
  lifecycle {
    precondition {
      condition     = var.confirm_deployment
      error_message = "Deployment is blocked. Set confirm_deployment=true only after change approval."
    }
    precondition {
      condition     = data.aws_caller_identity.current.account_id == var.expected_aws_account_id
      error_message = "The active AWS account does not match expected_aws_account_id."
    }
    precondition {
      condition     = length(data.aws_availability_zones.available.names) >= 2
      error_message = "The selected region must expose at least two availability zones."
    }
    precondition {
      condition     = !strcontains(var.container_image, ":latest")
      error_message = "Mutable latest tags are forbidden."
    }
    precondition {
      condition     = alltrue([for key in local.required_secret_keys : contains(keys(var.secret_arns), key)])
      error_message = "Required application secret ARNs are missing."
    }
    precondition {
      condition     = (var.domain_name == "" && var.route53_zone_id == "") || (var.domain_name != "" && var.route53_zone_id != "")
      error_message = "domain_name and route53_zone_id must either both be set or both be empty."
    }
  }
}

resource "aws_kms_key" "platform" {
  description             = "${local.name_prefix} encryption key"
  enable_key_rotation     = true
  deletion_window_in_days = 30
  depends_on              = [terraform_data.deployment_guard]
}
resource "aws_kms_alias" "platform" {
  name          = "alias/${local.name_prefix}"
  target_key_id = aws_kms_key.platform.key_id
}

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  depends_on           = [terraform_data.deployment_guard]
  tags                 = { Name = "${local.name_prefix}-vpc" }
}
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-igw" }
}
resource "aws_subnet" "public" {
  for_each = { for index, cidr in var.public_subnet_cidrs : index => cidr }
  vpc_id                  = aws_vpc.main.id
  cidr_block              = each.value
  availability_zone       = local.azs[tonumber(each.key)]
  map_public_ip_on_launch = false
  tags                    = { Name = "${local.name_prefix}-public-${each.key}" }
}
resource "aws_subnet" "app" {
  for_each = { for index, cidr in var.private_app_subnet_cidrs : index => cidr }
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = local.azs[tonumber(each.key)]
  tags              = { Name = "${local.name_prefix}-app-${each.key}" }
}
resource "aws_subnet" "data" {
  for_each = { for index, cidr in var.private_data_subnet_cidrs : index => cidr }
  vpc_id            = aws_vpc.main.id
  cidr_block        = each.value
  availability_zone = local.azs[tonumber(each.key)]
  tags              = { Name = "${local.name_prefix}-data-${each.key}" }
}
resource "aws_eip" "nat" {
  domain     = "vpc"
  depends_on = [aws_internet_gateway.main]
  tags       = { Name = "${local.name_prefix}-nat-eip" }
}
resource "aws_nat_gateway" "main" {
  allocation_id = aws_eip.nat.id
  subnet_id     = aws_subnet.public[0].id
  depends_on    = [aws_internet_gateway.main]
  tags          = { Name = "${local.name_prefix}-nat" }
}
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0" gateway_id = aws_internet_gateway.main.id }
  tags = { Name = "${local.name_prefix}-public" }
}
resource "aws_route_table_association" "public" {
  for_each       = aws_subnet.public
  subnet_id      = each.value.id
  route_table_id = aws_route_table.public.id
}
resource "aws_route_table" "app" {
  vpc_id = aws_vpc.main.id
  route { cidr_block = "0.0.0.0/0" nat_gateway_id = aws_nat_gateway.main.id }
  tags = { Name = "${local.name_prefix}-app" }
}
resource "aws_route_table_association" "app" {
  for_each       = aws_subnet.app
  subnet_id      = each.value.id
  route_table_id = aws_route_table.app.id
}
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.main.id
  tags   = { Name = "${local.name_prefix}-data-isolated" }
}
resource "aws_route_table_association" "data" {
  for_each       = aws_subnet.data
  subnet_id      = each.value.id
  route_table_id = aws_route_table.data.id
}

resource "aws_security_group" "alb" {
  name        = "${local.name_prefix}-alb"
  description = "HTTPS ingress to the public load balancer"
  vpc_id      = aws_vpc.main.id
  ingress { description = "HTTPS" from_port = 443 to_port = 443 protocol = "tcp" cidr_blocks = ["0.0.0.0/0"] }
  egress { description = "Application traffic inside the VPC" from_port = 3000 to_port = 3000 protocol = "tcp" cidr_blocks = [var.vpc_cidr] }
}
resource "aws_security_group" "app" {
  name        = "${local.name_prefix}-app"
  description = "Application tasks receive traffic only from the ALB"
  vpc_id      = aws_vpc.main.id
  ingress { from_port = 3000 to_port = 3000 protocol = "tcp" security_groups = [aws_security_group.alb.id] }
  egress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}
resource "aws_security_group" "database" {
  name        = "${local.name_prefix}-database"
  description = "PostgreSQL ingress only from application tasks"
  vpc_id      = aws_vpc.main.id
  ingress { from_port = 5432 to_port = 5432 protocol = "tcp" security_groups = [aws_security_group.app.id] }
  egress { from_port = 0 to_port = 0 protocol = "-1" cidr_blocks = ["0.0.0.0/0"] }
}

resource "aws_ecr_repository" "web" {
  name                 = "${local.name_prefix}-web"
  image_tag_mutability = "IMMUTABLE"
  force_delete         = false
  encryption_configuration { encryption_type = "KMS" kms_key = aws_kms_key.platform.arn }
  image_scanning_configuration { scan_on_push = true }
}
resource "aws_ecr_lifecycle_policy" "web" {
  repository = aws_ecr_repository.web.name
  policy = jsonencode({ rules = [{ rulePriority = 1, description = "Retain the latest 30 immutable images", selection = { tagStatus = "any", countType = "imageCountMoreThan", countNumber = 30 }, action = { type = "expire" } }] })
}
resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${local.name_prefix}/web"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.platform.arn
}
resource "aws_iam_role" "ecs_execution" {
  name = "${local.name_prefix}-ecs-execution"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}
resource "aws_iam_role_policy" "ecs_secrets" {
  name = "read-approved-secrets"
  role = aws_iam_role.ecs_execution.id
  policy = jsonencode({ Version = "2012-10-17", Statement = [
    { Sid = "ReadApprovedSecrets", Effect = "Allow", Action = ["secretsmanager:GetSecretValue"], Resource = values(var.secret_arns) },
    { Sid = "DecryptPlatformSecrets", Effect = "Allow", Action = ["kms:Decrypt"], Resource = [aws_kms_key.platform.arn] }
  ] })
}
resource "aws_iam_role" "ecs_task" {
  name = "${local.name_prefix}-ecs-task"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Effect = "Allow", Principal = { Service = "ecs-tasks.amazonaws.com" }, Action = "sts:AssumeRole" }] })
}
resource "aws_ecs_cluster" "main" {
  name = local.name_prefix
  setting { name = "containerInsights" value = "enabled" }
}
resource "aws_lb" "web" {
  name                       = substr("${local.name_prefix}-web", 0, 32)
  internal                   = false
  load_balancer_type         = "application"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = values(aws_subnet.public)[*].id
  enable_deletion_protection = true
  drop_invalid_header_fields = true
}
resource "aws_lb_target_group" "web" {
  name        = substr("${local.name_prefix}-web", 0, 32)
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"
  health_check { enabled = true path = "/api/health/ready" protocol = "HTTP" matcher = "200" interval = 30 timeout = 5 healthy_threshold = 2 unhealthy_threshold = 3 }
}
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.web.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = var.certificate_arn
  default_action { type = "forward" target_group_arn = aws_lb_target_group.web.arn }
}
resource "aws_ecs_task_definition" "web" {
  family                   = "${local.name_prefix}-web"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = tostring(var.ecs_cpu)
  memory                   = tostring(var.ecs_memory)
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn
  runtime_platform { operating_system_family = "LINUX" cpu_architecture = "X86_64" }
  volume { name = "tmp" }
  volume { name = "next_cache" }
  container_definitions = jsonencode([{
    name = "web", image = var.container_image, essential = true, user = "1001:1001", readonlyRootFilesystem = true,
    portMappings = [{ name = "http", containerPort = 3000, hostPort = 3000, protocol = "tcp" }],
    environment = [{ name = "NODE_ENV", value = "production" }, { name = "HOSTNAME", value = "0.0.0.0" }, { name = "PORT", value = "3000" }],
    secrets = [for name, value_from in var.secret_arns : { name = name, valueFrom = value_from }],
    mountPoints = [{ sourceVolume = "tmp", containerPath = "/tmp", readOnly = false }, { sourceVolume = "next_cache", containerPath = "/app/apps/web/.next/cache", readOnly = false }],
    healthCheck = { command = ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:3000/api/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""], interval = 30, timeout = 5, retries = 3, startPeriod = 20 },
    logConfiguration = { logDriver = "awslogs", options = { "awslogs-group" = aws_cloudwatch_log_group.web.name, "awslogs-region" = var.aws_region, "awslogs-stream-prefix" = "web" } }
  }])
}
resource "aws_ecs_service" "web" {
  name = "web" cluster = aws_ecs_cluster.main.id task_definition = aws_ecs_task_definition.web.arn desired_count = var.ecs_desired_count launch_type = "FARGATE" platform_version = "LATEST"
  deployment_minimum_healthy_percent = 100
  deployment_maximum_percent = 200
  enable_execute_command = false
  health_check_grace_period_seconds = 60
  network_configuration { subnets = values(aws_subnet.app)[*].id security_groups = [aws_security_group.app.id] assign_public_ip = false }
  load_balancer { target_group_arn = aws_lb_target_group.web.arn container_name = "web" container_port = 3000 }
  depends_on = [aws_lb_listener.https, aws_iam_role_policy_attachment.ecs_execution, aws_iam_role_policy.ecs_secrets]
  lifecycle { ignore_changes = [desired_count] }
}
resource "aws_appautoscaling_target" "web" {
  max_capacity = 6 min_capacity = 2
  resource_id = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.web.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace = "ecs"
}
resource "aws_appautoscaling_policy" "web_cpu" {
  name = "${local.name_prefix}-cpu" policy_type = "TargetTrackingScaling"
  resource_id = aws_appautoscaling_target.web.resource_id
  scalable_dimension = aws_appautoscaling_target.web.scalable_dimension
  service_namespace = aws_appautoscaling_target.web.service_namespace
  target_tracking_scaling_policy_configuration {
    target_value = 60 scale_in_cooldown = 120 scale_out_cooldown = 60
    predefined_metric_specification { predefined_metric_type = "ECSServiceAverageCPUUtilization" }
  }
}

resource "aws_s3_bucket" "quarantine" { bucket = "${local.name_prefix}-${data.aws_caller_identity.current.account_id}-${var.aws_region}-quarantine" force_destroy = false }
resource "aws_s3_bucket" "protected" { bucket = "${local.name_prefix}-${data.aws_caller_identity.current.account_id}-${var.aws_region}-protected" force_destroy = false }
resource "aws_s3_bucket_public_access_block" "files" {
  for_each = { quarantine = aws_s3_bucket.quarantine.id, protected = aws_s3_bucket.protected.id }
  bucket = each.value block_public_acls = true block_public_policy = true ignore_public_acls = true restrict_public_buckets = true
}
resource "aws_s3_bucket_ownership_controls" "files" {
  for_each = { quarantine = aws_s3_bucket.quarantine.id, protected = aws_s3_bucket.protected.id }
  bucket = each.value
  rule { object_ownership = "BucketOwnerEnforced" }
}
resource "aws_s3_bucket_versioning" "files" {
  for_each = { quarantine = aws_s3_bucket.quarantine.id, protected = aws_s3_bucket.protected.id }
  bucket = each.value
  versioning_configuration { status = "Enabled" }
}
resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  for_each = { quarantine = aws_s3_bucket.quarantine.id, protected = aws_s3_bucket.protected.id }
  bucket = each.value
  rule {
    blocked_encryption_types = ["SSE-C"]
    bucket_key_enabled = true
    apply_server_side_encryption_by_default { kms_master_key_id = aws_kms_key.platform.arn sse_algorithm = "aws:kms" }
  }
}
resource "aws_s3_bucket_lifecycle_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  rule { id = "expire-quarantine" status = "Enabled" filter {} expiration { days = 30 } noncurrent_version_expiration { noncurrent_days = 30 } }
}
resource "aws_sqs_queue" "file_scan_dlq" { name = "${local.name_prefix}-file-scan-dlq" message_retention_seconds = 1209600 kms_master_key_id = aws_kms_key.platform.arn }
resource "aws_sqs_queue" "file_scan" {
  name = "${local.name_prefix}-file-scan" visibility_timeout_seconds = 180 message_retention_seconds = 345600 receive_wait_time_seconds = 20 kms_master_key_id = aws_kms_key.platform.arn
  redrive_policy = jsonencode({ deadLetterTargetArn = aws_sqs_queue.file_scan_dlq.arn, maxReceiveCount = 5 })
}

resource "aws_db_subnet_group" "main" { name = "${local.name_prefix}-database" subnet_ids = values(aws_subnet.data)[*].id }
resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-postgres" engine = "postgres" engine_version = var.postgres_engine_version instance_class = var.db_instance_class
  allocated_storage = var.db_allocated_storage_gib max_allocated_storage = var.db_max_allocated_storage_gib storage_type = "gp3"
  storage_encrypted = true kms_key_id = aws_kms_key.platform.arn db_name = "lms_estimulo" username = "lms_admin"
  manage_master_user_password = true master_user_secret_kms_key_id = aws_kms_key.platform.arn
  db_subnet_group_name = aws_db_subnet_group.main.name vpc_security_group_ids = [aws_security_group.database.id] publicly_accessible = false multi_az = false
  backup_retention_period = 7 backup_window = "03:00-04:00" maintenance_window = "sun:04:30-sun:05:30" auto_minor_version_upgrade = true
  deletion_protection = true skip_final_snapshot = false final_snapshot_identifier = "${local.name_prefix}-final" copy_tags_to_snapshot = true
  performance_insights_enabled = true performance_insights_kms_key_id = aws_kms_key.platform.arn performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"] monitoring_interval = 0 apply_immediately = false
}

resource "aws_sns_topic" "alarms" { name = "${local.name_prefix}-alarms" kms_master_key_id = aws_kms_key.platform.arn }
resource "aws_sns_topic_subscription" "alarm_email" { count = var.alarm_email == "" ? 0 : 1 topic_arn = aws_sns_topic.alarms.arn protocol = "email" endpoint = var.alarm_email }
resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name = "${local.name_prefix}-alb-5xx" comparison_operator = "GreaterThanThreshold" evaluation_periods = 2 metric_name = "HTTPCode_Target_5XX_Count" namespace = "AWS/ApplicationELB" period = 300 statistic = "Sum" threshold = 5 treat_missing_data = "notBreaching"
  dimensions = { LoadBalancer = aws_lb.web.arn_suffix } alarm_actions = [aws_sns_topic.alarms.arn]
}
resource "aws_cloudwatch_metric_alarm" "file_scan_age" {
  alarm_name = "${local.name_prefix}-file-scan-age" comparison_operator = "GreaterThanThreshold" evaluation_periods = 2 metric_name = "ApproximateAgeOfOldestMessage" namespace = "AWS/SQS" period = 300 statistic = "Maximum" threshold = 900 treat_missing_data = "notBreaching"
  dimensions = { QueueName = aws_sqs_queue.file_scan.name } alarm_actions = [aws_sns_topic.alarms.arn]
}
resource "aws_cloudwatch_metric_alarm" "file_scan_dlq" {
  alarm_name = "${local.name_prefix}-file-scan-dlq" comparison_operator = "GreaterThanThreshold" evaluation_periods = 1 metric_name = "ApproximateNumberOfMessagesVisible" namespace = "AWS/SQS" period = 300 statistic = "Maximum" threshold = 0 treat_missing_data = "notBreaching"
  dimensions = { QueueName = aws_sqs_queue.file_scan_dlq.name } alarm_actions = [aws_sns_topic.alarms.arn]
}
resource "aws_cloudwatch_metric_alarm" "database_storage" {
  alarm_name = "${local.name_prefix}-database-storage" comparison_operator = "LessThanThreshold" evaluation_periods = 2 metric_name = "FreeStorageSpace" namespace = "AWS/RDS" period = 300 statistic = "Average" threshold = 5368709120 treat_missing_data = "missing"
  dimensions = { DBInstanceIdentifier = aws_db_instance.main.identifier } alarm_actions = [aws_sns_topic.alarms.arn]
}
resource "aws_route53_record" "web" {
  count = local.route53_enabled ? 1 : 0 zone_id = var.route53_zone_id name = var.domain_name type = "A"
  alias { name = aws_lb.web.dns_name zone_id = aws_lb.web.zone_id evaluate_target_health = true }
}
