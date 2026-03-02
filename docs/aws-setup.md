# AWS Setup

Step-by-step instructions for provisioning all AWS resources from scratch. Some resources (Cognito, S3, CloudFront) already exist for this project; those sections describe where to find the values you need rather than how to create them.

## Prerequisites

- AWS CLI v2 installed and configured with the `caleb` profile:
  ```bash
  aws configure --profile caleb
  ```
- Sufficient IAM permissions: Cognito, S3, CloudFront, DynamoDB, Lambda, IAM, API Gateway, CloudFormation

---

## 1. Cognito User Pool (existing)

The Cognito User Pool and App Client are already provisioned.

**Find your values:**

```bash
# List user pools
aws --profile caleb cognito-idp list-user-pools --max-results 20

# List app clients for a pool
aws --profile caleb cognito-idp list-user-pool-clients \
  --user-pool-id us-east-1_YOURPOOLID
```

Record:
- `UserPoolId` → `VUE_APP_COGNITO_USER_POOL_ID` in `.env`
- `ClientId` → `VUE_APP_COGNITO_CLIENT_ID` in `.env`
- Full ARN (`arn:aws:cognito-idp:us-east-1:ACCOUNT:userpool/POOL_ID`) → `CognitoUserPoolArn` in `infrastructure/parameters.json`

**Enable TOTP MFA on the admin user (strongly recommended):**

1. In the AWS Console → Cognito → User Pools → your pool → Users
2. Select your admin user → Actions → Enable MFA
3. Or use the Authenticator app on first login if the pool requires MFA

**Cognito brute-force protection** is enabled by default — accounts are temporarily locked after repeated failures.

---

## 2. S3 Bucket (existing)

The `patmacscopperworks.com` S3 bucket already exists and hosts the frontend.

### 2a. Verify Origin Access Control (OAC)

The bucket should only be accessible through CloudFront, not directly. Check your CloudFront distribution's origin settings:

```bash
aws --profile caleb cloudfront get-distribution \
  --id YOUR_DISTRIBUTION_ID \
  --query 'Distribution.DistributionConfig.Origins.Items[0].S3OriginConfig'
```

If the output shows an `OriginAccessIdentity` value, you are using the legacy **OAI**. Migrate to **OAC**:

1. Console → CloudFront → your distribution → Origins tab → Edit the S3 origin
2. Under "Origin access", select **Origin access control settings (recommended)**
3. Create a new OAC or select an existing one
4. Save changes — CloudFront will prompt you to update the S3 bucket policy automatically
5. Delete the old OAI if no other distributions use it

The resulting S3 bucket policy should allow `s3:GetObject` only from the CloudFront service principal:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": { "Service": "cloudfront.amazonaws.com" },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::patmacscopperworks.com/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::ACCOUNT_ID:distribution/DISTRIBUTION_ID"
        }
      }
    }
  ]
}
```

### 2b. Add S3 CORS policy

Admin image uploads go directly from the browser to S3 via presigned URL, bypassing CloudFront. The bucket needs a CORS rule to allow this:

1. Console → S3 → `patmacscopperworks.com` → Permissions tab → Cross-origin resource sharing (CORS)
2. Click Edit and paste:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT"],
    "AllowedOrigins": ["https://patmacscopperworks.com"],
    "MaxAgeSeconds": 3600
  }
]
```

3. Save.

> For local dev, you may temporarily add `"http://localhost:8080"` to `AllowedOrigins`. Remove it before going to production.

---

## 3. CloudFront Distribution (existing)

**Find your distribution ID:**

```bash
aws --profile caleb cloudfront list-distributions \
  --query 'DistributionList.Items[*].[Id,DomainName,Origins.Items[0].DomainName]' \
  --output table
```

Record the `Id` → `CloudFrontDistributionId` in `infrastructure/parameters.json`.

**Find your CloudFront URL** (already `https://patmacscopperworks.com`) → `VUE_APP_CLOUDFRONT_URL` in `.env`.

---

## 4. Create a deployment S3 bucket

The CloudFormation nested stacks and Lambda ZIP are uploaded to a separate deployment bucket. This keeps deployment artifacts out of the site bucket.

```bash
aws --profile caleb s3 mb s3://patmac-deployments --region us-east-1
```

Record the bucket name → `DeploymentBucket` in `infrastructure/parameters.json`.

---

## 5. Build and upload Lambda functions

From the project root:

```bash
# Install backend dependencies
cd backend && npm install --production && cd ..

# Create the ZIP (must include node_modules)
cd backend
zip -r ../functions.zip . --exclude "*.test.js"
cd ..

# Upload to deployment bucket
aws --profile caleb s3 cp functions.zip \
  s3://patmac-deployments/functions.zip
```

---

## 6. Upload CloudFormation templates

```bash
aws --profile caleb s3 sync infrastructure/ \
  s3://patmac-deployments/infrastructure/ \
  --exclude "parameters.json" \
  --exclude "parameters.json.example"
```

---

## 7. Create infrastructure/parameters.json

```bash
cp infrastructure/parameters.json.example infrastructure/parameters.json
```

Edit `infrastructure/parameters.json` with your real values:

| Parameter | Where to find it |
|-----------|-----------------|
| `CognitoUserPoolId` | Step 1 above |
| `CognitoUserPoolArn` | Step 1 above (`arn:aws:cognito-idp:...`) |
| `S3BucketName` | `patmacscopperworks.com` |
| `CloudFrontDistributionId` | Step 3 above |
| `DeploymentBucket` | Step 4 above |
| `FunctionsZipKey` | `functions.zip` |
| `AllowedOrigin` | `https://patmacscopperworks.com` |

> `infrastructure/parameters.json` is gitignored — never commit it.

---

## 8. Deploy CloudFormation stacks

```bash
aws --profile caleb cloudformation deploy \
  --template-file infrastructure/main.yaml \
  --stack-name patmac-prod \
  --parameter-overrides file://infrastructure/parameters.json \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

This deploys nested stacks in dependency order:
1. `DynamoStack` — DynamoDB table `copper-images-prod`
2. `IamStack` — Lambda execution role (least-privilege)
3. `LambdaStack` — 5 Lambda functions
4. `ApiStack` — API Gateway with Cognito authorizer + usage plan
5. `CloudFrontHeadersStack` — Security response headers policy

**Check stack status:**

```bash
aws --profile caleb cloudformation describe-stacks \
  --stack-name patmac-prod \
  --query 'Stacks[0].StackStatus'
```

**Get outputs** (API URL, etc.):

```bash
aws --profile caleb cloudformation describe-stacks \
  --stack-name patmac-prod \
  --query 'Stacks[0].Outputs'
```

Record `ApiUrl` → `VUE_APP_API_BASE_URL` in `.env`.

---

## 9. Attach the CloudFront security headers policy

The `cloudfront-headers.yaml` stack creates a **Response Headers Policy** but cannot automatically attach it to your existing distribution (CloudFormation cannot modify resources it doesn't own). Do this manually:

1. Get the policy ID from the stack output:
   ```bash
   aws --profile caleb cloudformation describe-stacks \
     --stack-name patmac-prod \
     --query 'Stacks[0].Outputs[?OutputKey==`SecurityHeadersPolicyId`].OutputValue' \
     --output text
   ```

2. Get your current distribution config:
   ```bash
   aws --profile caleb cloudfront get-distribution-config \
     --id YOUR_DISTRIBUTION_ID > /tmp/dist-config.json
   ```

3. In `/tmp/dist-config.json`, find `DefaultCacheBehavior` and add/update:
   ```json
   "ResponseHeadersPolicyId": "THE_POLICY_ID_FROM_STEP_1"
   ```

4. Extract the `ETag` from the response and update the distribution:
   ```bash
   ETAG=$(jq -r '.ETag' /tmp/dist-config.json)
   jq '.DistributionConfig' /tmp/dist-config.json > /tmp/dist-config-only.json

   aws --profile caleb cloudfront update-distribution \
     --id YOUR_DISTRIBUTION_ID \
     --distribution-config file:///tmp/dist-config-only.json \
     --if-match "$ETAG"
   ```

---

## 10. Migrate existing images

Run the migration script once to move the 49 static gallery images from `src/assets/` into S3 and create their DynamoDB records:

```bash
node scripts/migrate-images.js
```

The script uses the `caleb` AWS profile and targets `patmacscopperworks.com` (S3) and `copper-images-prod` (DynamoDB) by default.

After this runs successfully, the static images in `src/assets/` are no longer needed by the app — the gallery fetches from the API instead. They remain in the repo for archival purposes but are gitignored.

---

## 11. Fill in .env and deploy the frontend

```bash
# .env (gitignored)
VUE_APP_COGNITO_USER_POOL_ID=us-east-1_YOURPOOLID
VUE_APP_COGNITO_CLIENT_ID=YOURCLIENTID
VUE_APP_API_BASE_URL=https://YOURAPIID.execute-api.us-east-1.amazonaws.com/prod
VUE_APP_CLOUDFRONT_URL=https://patmacscopperworks.com
```

Then build and deploy:

```bash
yarn build
yarn deploy    # aws s3 sync ./dist s3://patmacscopperworks.com ...
```

Invalidate the CloudFront cache so the new build is served immediately:

```bash
aws --profile caleb cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

---

## Resource summary

| Resource | Name / ID | Notes |
|----------|-----------|-------|
| Cognito User Pool | `us-east-1_...` | Pre-existing |
| Cognito App Client | `...` | Pre-existing |
| S3 site bucket | `patmacscopperworks.com` | Pre-existing; hosts frontend + images |
| CloudFront distribution | `...` | Pre-existing; serves site + images |
| S3 deployment bucket | `patmac-deployments` | New; holds Lambda ZIP + CF templates |
| DynamoDB table | `copper-images-prod` | Created by CloudFormation |
| Lambda functions | `patmac-*-prod` (×5) | Created by CloudFormation |
| API Gateway | `patmac-api-prod` | Created by CloudFormation |
| IAM role | `patmac-lambda-role` | Created by CloudFormation |
| CF headers policy | `patmac-security-headers` | Created by CloudFormation; attached manually |

---

## Security notes

- The S3 bucket has **no public access** — all reads go through CloudFront OAC
- Admin uploads go directly to S3 via **presigned URL** (15-minute expiry) — Lambda never receives the file bytes
- Pending uploads that are never confirmed are auto-deleted by **DynamoDB TTL** after 1 hour
- API Gateway enforces a **usage plan**: 10 req/s, 20 burst, 2000/day
- Enable **TOTP MFA** on the admin Cognito user (see step 1)
