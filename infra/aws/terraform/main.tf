data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

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
