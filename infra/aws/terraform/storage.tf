resource "aws_s3_bucket" "quarantine" {
  bucket        = "${local.name_prefix}-${data.aws_caller_identity.current.account_id}-${var.aws_region}-quarantine"
  force_destroy = false
}

resource "aws_s3_bucket" "protected" {
  bucket        = "${local.name_prefix}-${data.aws_caller_identity.current.account_id}-${var.aws_region}-protected"
  force_destroy = false
}

resource "aws_s3_bucket_public_access_block" "files" {
  for_each = {
    quarantine = aws_s3_bucket.quarantine.id
    protected  = aws_s3_bucket.protected.id
  }
  bucket                  = each.value
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "files" {
  for_each = {
    quarantine = aws_s3_bucket.quarantine.id
    protected  = aws_s3_bucket.protected.id
  }
  bucket = each.value
  rule { object_ownership = "BucketOwnerEnforced" }
}

resource "aws_s3_bucket_versioning" "files" {
  for_each = {
    quarantine = aws_s3_bucket.quarantine.id
    protected  = aws_s3_bucket.protected.id
  }
  bucket = each.value
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "files" {
  for_each = {
    quarantine = aws_s3_bucket.quarantine.id
    protected  = aws_s3_bucket.protected.id
  }
  bucket = each.value
  rule {
    blocked_encryption_types = ["SSE-C"]
    bucket_key_enabled       = true
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.platform.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "quarantine" {
  bucket = aws_s3_bucket.quarantine.id
  rule {
    id     = "expire-quarantine"
    status = "Enabled"
    filter {}
    expiration { days = 30 }
    noncurrent_version_expiration { noncurrent_days = 30 }
  }
}

resource "aws_sqs_queue" "file_scan_dlq" {
  name                      = "${local.name_prefix}-file-scan-dlq"
  message_retention_seconds = 1209600
  kms_master_key_id         = aws_kms_key.platform.arn
}

resource "aws_sqs_queue" "file_scan" {
  name                       = "${local.name_prefix}-file-scan"
  visibility_timeout_seconds = 180
  message_retention_seconds  = 345600
  receive_wait_time_seconds  = 20
  kms_master_key_id          = aws_kms_key.platform.arn
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.file_scan_dlq.arn
    maxReceiveCount     = 5
  })
}
