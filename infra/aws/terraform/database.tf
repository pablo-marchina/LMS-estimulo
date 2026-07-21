resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-database"
  subnet_ids = values(aws_subnet.data)[*].id
}

resource "aws_db_instance" "main" {
  identifier                            = "${local.name_prefix}-postgres"
  engine                                = "postgres"
  engine_version                        = var.postgres_engine_version
  instance_class                        = var.db_instance_class
  allocated_storage                     = var.db_allocated_storage_gib
  max_allocated_storage                 = var.db_max_allocated_storage_gib
  storage_type                          = "gp3"
  storage_encrypted                     = true
  kms_key_id                            = aws_kms_key.platform.arn
  db_name                               = "lms_estimulo"
  username                              = "lms_admin"
  manage_master_user_password           = true
  master_user_secret_kms_key_id         = aws_kms_key.platform.arn
  db_subnet_group_name                  = aws_db_subnet_group.main.name
  vpc_security_group_ids                = [aws_security_group.database.id]
  publicly_accessible                   = false
  multi_az                              = false
  backup_retention_period               = 7
  backup_window                         = "03:00-04:00"
  maintenance_window                    = "sun:04:30-sun:05:30"
  auto_minor_version_upgrade            = true
  deletion_protection                   = true
  skip_final_snapshot                   = false
  final_snapshot_identifier             = "${local.name_prefix}-final"
  copy_tags_to_snapshot                 = true
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = aws_kms_key.platform.arn
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]
  monitoring_interval                   = 0
  apply_immediately                     = false
}
