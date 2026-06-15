#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="${NAMESPACE:-localstack}"
LOCALSTACK_DEPLOYMENT="${LOCALSTACK_DEPLOYMENT:-localstack}"

BUCKET="${IMAGE_S3_BUCKET:-ecommerce-images}"
REGION="${AWS_REGION:-us-east-1}"

run_awslocal() {
  kubectl exec -n "${NAMESPACE}" "deploy/${LOCALSTACK_DEPLOYMENT}" -- awslocal "$@"
}

echo "==> Ensuring S3 bucket: ${BUCKET}"
run_awslocal s3api create-bucket --bucket "${BUCKET}" --region "${REGION}" >/dev/null 2>&1 || true
run_awslocal s3api put-public-access-block \
  --bucket "${BUCKET}" \
  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true \
  >/dev/null 2>&1 || true

echo "==> Creating/ensuring CloudFront OAI"
if ! run_awslocal cloudfront list-distributions >/dev/null 2>&1; then
  echo
  echo "CloudFront no está disponible en tu LocalStack actual (feature no implementada o requiere Pro)."
  echo "Sugerencia para DEV local: servir directo desde S3 con el dominio de LocalStack."
  echo
  echo "Usá estas variables:"
  echo "  export IMAGE_STORAGE_PROVIDER=s3"
  echo "  export IMAGE_S3_BUCKET=\"${BUCKET}\""
  echo "  export IMAGE_S3_EXTERNAL_BASE_URL=\"http://s3.${REGION}.localhost.localstack.cloud:4566/${BUCKET}\""
  echo "  unset IMAGE_CDN_BASE_URL"
  exit 0
fi

OAI_JSON="$(run_awslocal cloudfront create-cloud-front-origin-access-identity \
  --cloud-front-origin-access-identity-config CallerReference="${BUCKET}-oai",Comment="OAI for ${BUCKET}" 2>/dev/null || true)"

if [[ -z "${OAI_JSON}" ]]; then
  # Already exists case: fetch first identity
  OAI_JSON="$(run_awslocal cloudfront list-cloud-front-origin-access-identities)"
  OAI_ID="$(echo "${OAI_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const items=j?.CloudFrontOriginAccessIdentityList?.Items||[];const x=items.find(i=>i?.Comment===('OAI for ${BUCKET}'))||items[0];console.log(x?.Id||'');});")"
  OAI_CANONICAL="$(echo "${OAI_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const items=j?.CloudFrontOriginAccessIdentityList?.Items||[];const x=items.find(i=>i?.Comment===('OAI for ${BUCKET}'))||items[0];console.log(x?.S3CanonicalUserId||'');});")"
else
  OAI_ID="$(echo "${OAI_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j?.CloudFrontOriginAccessIdentity?.Id||'');});")"
  OAI_CANONICAL="$(echo "${OAI_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j?.CloudFrontOriginAccessIdentity?.S3CanonicalUserId||'');});")"
fi

if [[ -z "${OAI_ID}" || -z "${OAI_CANONICAL}" ]]; then
  echo "ERROR: no pude obtener OAI Id / CanonicalUserId" >&2
  exit 1
fi

echo "==> Creating CloudFront distribution (if not exists)"
# Check existing distributions referencing this bucket
LIST_JSON="$(run_awslocal cloudfront list-distributions)"
EXISTING_DOMAIN="$(echo "${LIST_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const items=j?.DistributionList?.Items||[];const hit=items.find(x=>(x?.Origins?.Items||[]).some(o=>o?.DomainName==('${BUCKET}.s3.amazonaws.com')));console.log(hit?.DomainName||'');});")"
EXISTING_ID="$(echo "${LIST_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);const items=j?.DistributionList?.Items||[];const hit=items.find(x=>(x?.Origins?.Items||[]).some(o=>o?.DomainName==('${BUCKET}.s3.amazonaws.com')));console.log(hit?.Id||'');});")"

if [[ -n "${EXISTING_DOMAIN}" ]]; then
  DIST_DOMAIN="${EXISTING_DOMAIN}"
  DIST_ID="${EXISTING_ID}"
else
  DIST_CONFIG="$(cat <<JSON
{
  "CallerReference": "${BUCKET}-dist",
  "Comment": "CloudFront for ${BUCKET}",
  "Enabled": true,
  "Origins": {
    "Quantity": 1,
    "Items": [
      {
        "Id": "S3-${BUCKET}",
        "DomainName": "${BUCKET}.s3.amazonaws.com",
        "S3OriginConfig": {
          "OriginAccessIdentity": "origin-access-identity/cloudfront/${OAI_ID}"
        }
      }
    ]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "S3-${BUCKET}",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "TrustedSigners": { "Enabled": false, "Quantity": 0 },
    "ForwardedValues": { "QueryString": false, "Cookies": { "Forward": "none" } },
    "AllowedMethods": {
      "Quantity": 3,
      "Items": ["GET", "HEAD", "OPTIONS"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET", "HEAD"] }
    },
    "MinTTL": 0
  }
}
JSON
)"

  CREATE_JSON="$(run_awslocal cloudfront create-distribution --distribution-config "${DIST_CONFIG}")"
  DIST_DOMAIN="$(echo "${CREATE_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j?.Distribution?.DomainName||'');});")"
  DIST_ID="$(echo "${CREATE_JSON}" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{const j=JSON.parse(d);console.log(j?.Distribution?.Id||'');});")"
fi

echo "==> Applying bucket policy to allow OAI read"
POLICY="$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontOAIRead",
      "Effect": "Allow",
      "Principal": { "CanonicalUser": "${OAI_CANONICAL}" },
      "Action": ["s3:GetObject"],
      "Resource": ["arn:aws:s3:::${BUCKET}/*"]
    }
  ]
}
JSON
)"

run_awslocal s3api put-bucket-policy --bucket "${BUCKET}" --policy "${POLICY}" >/dev/null

echo
echo "CloudFront distribution:"
echo "  Id: ${DIST_ID}"
echo "  DomainName: ${DIST_DOMAIN}"
echo
echo "Para usar desde el host (LocalStack DNS):"
echo "  export IMAGE_CDN_BASE_URL=\"https://${DIST_DOMAIN}.localhost.localstack.cloud:4566\""
echo
echo "Nota: si no te resuelve HTTPS, probá HTTP:"
echo "  export IMAGE_CDN_BASE_URL=\"http://${DIST_DOMAIN}.localhost.localstack.cloud:4566\""
