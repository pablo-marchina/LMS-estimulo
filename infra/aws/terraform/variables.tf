variable "confirm_deployment" {
  description = "Must be explicitly true before Terraform may plan or apply deployable resources."
  type        = bool
  default     = false
}

variable "expected_aws_account_id" {
  description = "Twelve-digit AWS account ID that must match the active caller."
  type        = string

  validation {
    condition     = can(regex("^[0-9]{12}$", var.expected_aws_account_id))
    error_message = "expected_aws_account_id must contain exactly twelve digits."
  }
}

variable "aws_region" {
  description = "AWS region approved for the staging environment."
  type        = string

  validation {
    condition     = can(regex("^[a-z]{2}(-gov)?-[a-z]+-[0-9]+$", var.aws_region))
    error_message = "aws_region must be an explicit AWS region such as sa-east-1."
  }
}

variable "project_name" {
  description = "Lowercase project identifier used in resource names."
  type        = string
  default     = "lms-estimulo"

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{2,30}$", var.project_name))
    error_message = "project_name must be lowercase kebab-case with 3 to 31 characters."
  }
}

variable "environment" {
  description = "Environment name. This baseline is intentionally restricted to staging."
  type        = string
  default     = "staging"

  validation {
    condition     = var.environment == "staging"
    error_message = "This Terraform baseline is restricted to staging. Production requires a separately approved stack."
  }
}

variable "container_image" {
  description = "Immutable OCI image reference including @sha256 digest."
  type        = string

  validation {
    condition     = can(regex("@sha256:[a-f0-9]{64}$", var.container_image))
    error_message = "container_image must be immutable and end in @sha256:<64 lowercase hex characters>."
  }
}

variable "certificate_arn" {
  description = "ACM certificate ARN for the HTTPS listener."
  type        = string

  validation {
    condition     = can(regex("^arn:aws(-[a-z]+)?:acm:[a-z0-9-]+:[0-9]{12}:certificate/[0-9a-f-]+$", var.certificate_arn))
    error_message = "certificate_arn must be an ACM certificate ARN."
  }
}

variable "public_environment" {
  description = "Public configuration baked into the Next.js image at build time and repeated at runtime for server-side access."
  type = object({
    app_url             = string
    supabase_url        = string
    supabase_anon_key   = string
  })

  validation {
    condition = (
      can(regex("^https://", var.public_environment.app_url))
      && can(regex("^https://", var.public_environment.supabase_url))
      && length(trimspace(var.public_environment.supabase_anon_key)) >= 20
    )
    error_message = "public_environment URLs must use HTTPS and supabase_anon_key must be a non-empty public client key."
  }
}

variable "secret_arns" {
  description = "Secrets Manager ARNs mapped only to server-side runtime variable names. Secret values never enter Terraform state."
  type        = map(string)
  sensitive   = true

  validation {
    condition = (
      contains(keys(var.secret_arns), "SUPABASE_SERVICE_ROLE_KEY")
      && alltrue([
        for name, arn in var.secret_arns : (
          !startswith(name, "NEXT_PUBLIC_")
          && can(regex("^arn:aws(-[a-z]+)?:secretsmanager:", arn))
        )
      ])
    )
    error_message = "secret_arns must contain SUPABASE_SERVICE_ROLE_KEY, use Secrets Manager ARNs, and must not contain NEXT_PUBLIC_ variables."
  }
}

variable "domain_name" {
  description = "Optional staging hostname. Leave empty to avoid Route53 changes."
  type        = string
  default     = ""
}

variable "route53_zone_id" {
  description = "Optional Route53 hosted zone ID. Required only when domain_name is set."
  type        = string
  default     = ""
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR for the staging VPC."
  default     = "10.40.0.0/16"
}

variable "public_subnet_cidrs" {
  type        = list(string)
  description = "Two public subnet CIDRs for the ALB and NAT gateway."
  default     = ["10.40.0.0/24", "10.40.1.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 2
    error_message = "Exactly two public subnet CIDRs are required."
  }
}

variable "private_app_subnet_cidrs" {
  type        = list(string)
  description = "Two private subnet CIDRs for ECS tasks."
  default     = ["10.40.10.0/24", "10.40.11.0/24"]

  validation {
    condition     = length(var.private_app_subnet_cidrs) == 2
    error_message = "Exactly two private application subnet CIDRs are required."
  }
}

variable "private_data_subnet_cidrs" {
  type        = list(string)
  description = "Two isolated subnet CIDRs for RDS."
  default     = ["10.40.20.0/24", "10.40.21.0/24"]

  validation {
    condition     = length(var.private_data_subnet_cidrs) == 2
    error_message = "Exactly two private data subnet CIDRs are required."
  }
}

variable "ecs_cpu" {
  type        = number
  default     = 512
  description = "Fargate task CPU units."
}

variable "ecs_memory" {
  type        = number
  default     = 1024
  description = "Fargate task memory in MiB."
}

variable "ecs_desired_count" {
  type        = number
  default     = 2
  description = "Desired ECS task count across availability zones."

  validation {
    condition     = var.ecs_desired_count >= 2
    error_message = "At least two ECS tasks are required for staging availability evidence."
  }
}

variable "postgres_engine_version" {
  type        = string
  default     = "17.4"
  description = "RDS PostgreSQL engine version approved for staging."
}

variable "db_instance_class" {
  type        = string
  default     = "db.t4g.small"
  description = "RDS instance class for staging."
}

variable "db_allocated_storage_gib" {
  type        = number
  default     = 50
  description = "Initial encrypted RDS storage in GiB."
}

variable "db_max_allocated_storage_gib" {
  type        = number
  default     = 200
  description = "Maximum RDS autoscaling storage in GiB."
}

variable "alarm_email" {
  description = "Optional email endpoint for staging alarms. Subscription requires external confirmation."
  type        = string
  default     = ""
}
