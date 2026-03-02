# Deployment

This project has two independently deployable parts:

| Part | What it is | How to deploy |
|------|-----------|---------------|
| **Frontend** | Vue SPA built to `/dist` | `yarn build && yarn deploy` (S3 sync) |
| **Backend** | Lambda functions | Zip → S3 → `aws cloudformation deploy` |

---

## Frontend deployment

### Build

```bash
yarn build
```

Output goes to `/dist`. The build picks up environment variables from `.env` (never from `.env.local` — that file is only used by the dev server).

Make sure `.env` has real production values before building:

```
VUE_APP_COGNITO_USER_POOL_ID=us-east-1_...
VUE_APP_COGNITO_CLIENT_ID=...
VUE_APP_API_BASE_URL=https://....execute-api.us-east-1.amazonaws.com/prod
VUE_APP_CLOUDFRONT_URL=https://patmacscopperworks.com
```

### Deploy to S3

```bash
yarn deploy
```

This runs:
```bash
aws --profile caleb s3 sync ./dist s3://patmacscopperworks.com \
  --exclude '*.gz' \
  --delete
```

`--delete` removes files in S3 that no longer exist in `/dist`, keeping the bucket in sync with the build output.

### Invalidate CloudFront cache

After every frontend deploy, invalidate the cache so users get the new build immediately rather than a cached version:

```bash
aws --profile caleb cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

> Invalidations typically take 30–60 seconds to propagate globally. You can monitor progress in the CloudFront console under Invalidations.

---

## Backend deployment

### When to redeploy the backend

Redeploy the backend when you change any file under `backend/`. Frontend-only changes (Vue components, CSS, env vars) do not require a backend redeploy.

### Step 1 — Install production dependencies

```bash
cd backend
npm install --production
cd ..
```

This ensures `node_modules` inside `backend/` contains only runtime dependencies (no dev deps).

### Step 2 — Create the Lambda ZIP

```bash
cd backend
zip -r ../functions.zip . --exclude "*.test.js" --exclude "package-lock.json"
cd ..
```

The ZIP must include the `node_modules` directory because Lambda uses the bundled dependencies at runtime.

### Step 3 — Upload the ZIP to S3

```bash
aws --profile caleb s3 cp functions.zip \
  s3://patmac-deployments/functions.zip
```

### Step 4 — Upload updated CloudFormation templates (if changed)

Only needed when you've edited files in `infrastructure/`:

```bash
aws --profile caleb s3 sync infrastructure/ \
  s3://patmac-deployments/infrastructure/ \
  --exclude "parameters.json" \
  --exclude "parameters.json.example"
```

### Step 5 — Deploy CloudFormation

```bash
aws --profile caleb cloudformation deploy \
  --template-file infrastructure/main.yaml \
  --stack-name patmac-prod \
  --parameter-overrides file://infrastructure/parameters.json \
  --capabilities CAPABILITY_IAM \
  --region us-east-1
```

CloudFormation performs a **change set** — it only updates resources that changed. If only the Lambda code changed (new ZIP), it updates the Lambda functions without touching DynamoDB or API Gateway.

### Step 6 — Force Lambda to use the new code

When you upload a new ZIP to the same S3 key, CloudFormation may not detect the change (the S3 key didn't change). Force a redeploy by updating `FunctionsZipKey` to include a version or timestamp:

```bash
# Upload with a versioned key
aws --profile caleb s3 cp functions.zip \
  s3://patmac-deployments/functions-v2.zip

# Update parameters.json
# "FunctionsZipKey": "functions-v2.zip"

# Redeploy
aws --profile caleb cloudformation deploy ...
```

Or use an AWS CodeBuild/GitHub Actions pipeline that generates a unique key per build.

---

## Checking deployment health

**Verify the API is responding:**

```bash
curl https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod/images
# Should return { "images": [...] }
```

**Check Lambda logs:**

```bash
aws --profile caleb logs tail /aws/lambda/patmac-getImages-prod --follow
```

**Check CloudFormation stack status:**

```bash
aws --profile caleb cloudformation describe-stacks \
  --stack-name patmac-prod \
  --query 'Stacks[0].StackStatus'
```

Expected values: `CREATE_COMPLETE` or `UPDATE_COMPLETE`. Any `*_FAILED` status means a rollback occurred — check stack events:

```bash
aws --profile caleb cloudformation describe-stack-events \
  --stack-name patmac-prod \
  --query 'StackEvents[?ResourceStatus==`CREATE_FAILED` || ResourceStatus==`UPDATE_FAILED`].[LogicalResourceId,ResourceStatusReason]' \
  --output table
```

---

## Rollback

### Frontend rollback

S3 does not maintain deployment history. To roll back, rebuild from the previous Git commit and redeploy:

```bash
git checkout <previous-commit>
yarn build
yarn deploy
aws --profile caleb cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### Backend rollback

Re-upload the previous Lambda ZIP and redeploy CloudFormation:

```bash
# If you kept previous ZIPs versioned in S3:
# Update FunctionsZipKey in parameters.json to the previous version key
aws --profile caleb cloudformation deploy ...
```

Or use the Lambda console to **deploy a previous version** if you have versioning enabled on the functions.

---

## Deployment checklist

Before deploying to production:

- [ ] `.env` has correct production values (not local dev placeholders)
- [ ] `yarn build` completes without errors
- [ ] `infrastructure/parameters.json` has correct production values
- [ ] `backend/node_modules` is up to date (`npm install --production`)
- [ ] New `functions.zip` uploaded to S3 with a versioned key (or existing key updated)
- [ ] CloudFormation deployed successfully (`UPDATE_COMPLETE`)
- [ ] `GET /images` returns expected data
- [ ] Frontend deployed with `yarn deploy`
- [ ] CloudFront cache invalidated
- [ ] Site loads correctly at `https://patmacscopperworks.com`
- [ ] Admin sign-in works at `https://patmacscopperworks.com/login`
