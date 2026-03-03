#!/usr/bin/env bash
set -euo pipefail

ENDPOINT=http://localhost:4566
REGION=us-east-1
TABLE_NAME=copper-images-local
BUCKET_NAME=patmacscopperworks-local

echo "Waiting for LocalStack to be ready..."
until aws --endpoint-url="$ENDPOINT" --region "$REGION" \
  --no-cli-pager s3 ls > /dev/null 2>&1; do
  sleep 1
done
echo "LocalStack is ready."

echo "Creating DynamoDB table: $TABLE_NAME"
aws --endpoint-url="$ENDPOINT" --region "$REGION" --no-cli-pager \
  dynamodb create-table \
  --table-name "$TABLE_NAME" \
  --attribute-definitions AttributeName=imageId,AttributeType=S \
  --key-schema AttributeName=imageId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  2>/dev/null || echo "Table already exists."

echo "Creating S3 bucket: $BUCKET_NAME"
aws --endpoint-url="$ENDPOINT" --region "$REGION" --no-cli-pager \
  s3 mb "s3://$BUCKET_NAME" \
  2>/dev/null || echo "Bucket already exists."

echo "Configuring S3 bucket CORS: $BUCKET_NAME"
aws --endpoint-url="$ENDPOINT" --region "$REGION" --no-cli-pager \
  s3api put-bucket-cors \
  --bucket "$BUCKET_NAME" \
  --cors-configuration '{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","PUT","POST","DELETE","HEAD"],"AllowedOrigins":["*"],"ExposeHeaders":["ETag"]}]}'

echo "Local dev setup complete."
echo "  DynamoDB table: $TABLE_NAME"
echo "  S3 bucket: $BUCKET_NAME"
echo "  Endpoint: $ENDPOINT"
