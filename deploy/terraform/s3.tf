# Bucket para imágenes de productos/banners/landings, referenciado en el
# diagrama como "Amazon S3 (ecommerce-images)". Hoy no existe ningún bucket
# en la cuenta — lo crea este recurso.

resource "aws_s3_bucket" "ecommerce_images" {
  bucket = "${local.name_prefix}-ecommerce-images"

  tags = {
    Environment = var.environment
    ManagedBy   = "Terraform"
    ProjectName = var.project_name
  }
}

resource "aws_s3_bucket_public_access_block" "ecommerce_images" {
  bucket = aws_s3_bucket.ecommerce_images.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "ecommerce_images" {
  bucket = aws_s3_bucket.ecommerce_images.id
  versioning_configuration {
    status = "Enabled"
  }
}
