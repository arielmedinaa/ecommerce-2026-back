#!/bin/bash
# Provisiona SOLO recursos sin costo del diagrama esquemaGrafico-Arquitecture.png,
# dentro de la VPC jjconsulting ya existente (vpc-0c2e4dee7b74a9f00).
# Deja afuera a propósito: ALB, Cloud Map, CloudFront, Secrets Manager, NAT Gateway
# (ya existe) y no crea ningún ECS Service (eso sí generaría cómputo Fargate facturable).
set -euo pipefail

set -a
source "$(dirname "$0")/../../aws.json"
set +a
export AWS_DEFAULT_REGION=sa-east-1

VPC_ID="vpc-0c2e4dee7b74a9f00"
ACCOUNT_ID="286879406751"
PROJECT="jjconsulting"

echo "=== 1. IAM: ecsTaskExecutionRole (pull de ECR + logs) ==="
cat > /tmp/ecs-trust-policy.json <<'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    { "Effect": "Allow", "Principal": { "Service": "ecs-tasks.amazonaws.com" }, "Action": "sts:AssumeRole" }
  ]
}
EOF

aws iam create-role --role-name ${PROJECT}-ecsTaskExecutionRole \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
  --tags Key=ProjectName,Value=${PROJECT} Key=ManagedBy,Value=claude-cli || echo "(ya existe, sigo)"

aws iam attach-role-policy --role-name ${PROJECT}-ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

echo "=== 2. IAM: ecsTaskRole (permisos de negocio: S3 imágenes, SQS, SSM) ==="
aws iam create-role --role-name ${PROJECT}-ecsTaskRole \
  --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
  --tags Key=ProjectName,Value=${PROJECT} Key=ManagedBy,Value=claude-cli || echo "(ya existe, sigo)"

cat > /tmp/ecs-task-role-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::${PROJECT}-ecommerce-images",
        "arn:aws:s3:::${PROJECT}-ecommerce-images/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"],
      "Resource": "arn:aws:sqs:sa-east-1:${ACCOUNT_ID}:${PROJECT}-payments-jobs"
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
      "Resource": "arn:aws:ssm:sa-east-1:${ACCOUNT_ID}:parameter/${PROJECT}/*"
    }
  ]
}
EOF
aws iam put-role-policy --role-name ${PROJECT}-ecsTaskRole \
  --policy-name ${PROJECT}-ecsTaskRole-inline \
  --policy-document file:///tmp/ecs-task-role-policy.json

echo "=== 3. ECS Cluster (Fargate, sin servicios/tasks corriendo = sin costo) ==="
aws ecs create-cluster --cluster-name ${PROJECT}-ecs-cluster \
  --tags key=ProjectName,value=${PROJECT} key=ManagedBy,value=claude-cli

echo "=== 4. Security Group para las tasks ECS ==="
SG_ID=$(aws ec2 create-security-group \
  --group-name ${PROJECT}-ecs-tasks-sg \
  --description "SG para tasks Fargate de microservicios ${PROJECT}" \
  --vpc-id ${VPC_ID} \
  --tag-specifications "ResourceType=security-group,Tags=[{Key=ProjectName,Value=${PROJECT}},{Key=ManagedBy,Value=claude-cli}]" \
  --query 'GroupId' --output text)
echo "SG creado: $SG_ID"
# Trafico interno libre entre servicios (NATS, HTTP interno) dentro del propio SG
aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol -1 --source-group $SG_ID
echo "$SG_ID" > /tmp/jjconsulting-ecs-tasks-sg.txt

echo "=== 5. Permitir que las tasks ECS lleguen a RDS y Redis existentes ==="
aws ec2 authorize-security-group-ingress --group-id sg-0b5978db5e204f170 --protocol tcp --port 3306 --source-group $SG_ID || echo "(regla ya existe o falló, revisar a mano)"
aws ec2 authorize-security-group-ingress --group-id sg-06e28c7a3c6e380cd --protocol tcp --port 6379 --source-group $SG_ID || echo "(regla ya existe o falló, revisar a mano)"

echo "=== 6. S3 bucket de imágenes ==="
aws s3api create-bucket --bucket ${PROJECT}-ecommerce-images \
  --create-bucket-configuration LocationConstraint=sa-east-1
aws s3api put-public-access-block --bucket ${PROJECT}-ecommerce-images \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true
aws s3api put-bucket-tagging --bucket ${PROJECT}-ecommerce-images \
  --tagging 'TagSet=[{Key=ProjectName,Value='${PROJECT}'},{Key=ManagedBy,Value=claude-cli}]'

echo "=== 7. Cola SQS de jobs de pago ==="
aws sqs create-queue --queue-name ${PROJECT}-payments-jobs \
  --attributes VisibilityTimeout=60,MessageRetentionPeriod=345600 \
  --tags ProjectName=${PROJECT},ManagedBy=claude-cli

echo "=== 8. Log groups en CloudWatch (uno por servicio) ==="
for svc in api-gateway auth-service products-service content-service payments-service cart-service image-service mail-service etl-service nats; do
  aws logs create-log-group --log-group-name "/ecs/${PROJECT}/${svc}" \
    --tags ProjectName=${PROJECT},ManagedBy=claude-cli || echo "(ya existe: $svc)"
  aws logs put-retention-policy --log-group-name "/ecs/${PROJECT}/${svc}" --retention-in-days 14
done

echo "=== 9. SSM Parameter Store (config compartida, tier Standard = gratis) ==="
SQS_URL=$(aws sqs get-queue-url --queue-name ${PROJECT}-payments-jobs --query 'QueueUrl' --output text)
aws ssm put-parameter --name "/${PROJECT}/prod/s3-images-bucket" --type String --value "${PROJECT}-ecommerce-images" --overwrite
aws ssm put-parameter --name "/${PROJECT}/prod/sqs-payments-jobs-url" --type String --value "$SQS_URL" --overwrite
aws ssm put-parameter --name "/${PROJECT}/prod/rds-endpoint" --type String --value "jjconsulting.c5e82o4ee48p.sa-east-1.rds.amazonaws.com" --overwrite
aws ssm put-parameter --name "/${PROJECT}/prod/redis-endpoint" --type String --value "jjconsulting-elasticache-redis7-001.jjconsulting-elasticache-redis7.jezyiw.sae1.cache.amazonaws.com" --overwrite

echo
echo "=== LISTO ==="
echo "Cluster ECS: ${PROJECT}-ecs-cluster"
echo "SG tasks: $SG_ID"
echo "Bucket S3: ${PROJECT}-ecommerce-images"
echo "Cola SQS: $SQS_URL"
echo
echo "Pendiente a mano (genera costo, no lo creo automático): ALB, Cloud Map, CloudFront, Secrets Manager, ECS Services (correr las tasks)."
