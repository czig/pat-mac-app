# Local Development

This guide covers running the full stack locally without real AWS credentials. LocalStack provides S3 and DynamoDB; a thin Express server replaces Lambda and API Gateway.

## Prerequisites

- [Node.js](https://nodejs.org) (project was built with v23; use `--ignore-engines` flag with yarn)
- [Docker](https://www.docker.com/get-started) (for LocalStack)
- [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) (for running setup commands against LocalStack)
- yarn: `npm install -g yarn`

## 1. Install dependencies

```bash
yarn install --ignore-engines
```

```bash
cd backend && npm install && cd ..
```

## 2. Start LocalStack

LocalStack Community provides free local S3 and DynamoDB.

```bash
docker compose -f local-dev/docker-compose.yml up -d
```

Verify it started:

```bash
curl http://localhost:4566/_localstack/health
# Should include "s3": "running", "dynamodb": "running"
```

## 3. Create the local table and bucket

Run the setup script once (safe to re-run — it skips resources that already exist):

```bash
bash local-dev/setup.sh
```

This creates:
- DynamoDB table `copper-images-local`
- S3 bucket `patmacscopperworks-local`

## 4. Configure the Vue app environment

```bash
cp local-dev/.env.local.example .env.local
```

`.env.local` overrides `.env` during `yarn serve`. The defaults point the Vue app at `http://localhost:3001` (the local Express server) and at LocalStack for images.

If you need Cognito auth locally (e.g., testing the login flow against a real user pool), edit `.env.local` with real Cognito values. Otherwise, the local server skips auth entirely.

## 5. Start the local API server

The Express server in `local-dev/local-server.js` imports the Lambda handlers directly and simulates API Gateway's event shape. Auth is skipped — all routes are open.

```bash
yarn local-server
# Listening at http://localhost:3001
```

Leave this running in a separate terminal.

## 6. Start the Vue dev server

```bash
yarn serve
# http://localhost:8080
```

The app will fetch images from `http://localhost:3001/images` and display them from LocalStack's S3.

## 7. Load test data (optional)

To populate the local DynamoDB and S3 with the existing gallery images:

```bash
S3_BUCKET=patmacscopperworks-local \
DYNAMODB_TABLE=copper-images-local \
AWS_ENDPOINT_URL=http://localhost:4566 \
AWS_DEFAULT_REGION=us-east-1 \
AWS_ACCESS_KEY_ID=test \
AWS_SECRET_ACCESS_KEY=test \
node scripts/migrate-images.js
```

> Note: the migration script defaults to the `caleb` AWS profile for production. The environment variables above override it to use LocalStack instead.

## Local dev flow summary

```
Browser (localhost:8080)
  ↓ yarn serve
Vue App
  ↓ http://localhost:3001
Express server (local-server.js)
  ↓ imports handlers directly
Lambda handlers (backend/*.js)
  ↓ LocalStack endpoint
LocalStack (localhost:4566)
  ├── DynamoDB: copper-images-local
  └── S3: patmacscopperworks-local
```

## Stopping local services

```bash
docker compose -f local-dev/docker-compose.yml down
```

Add `-v` to also remove the persisted LocalStack data volume:

```bash
docker compose -f local-dev/docker-compose.yml down -v
```

## Troubleshooting

**`curl http://localhost:4566` hangs or returns connection refused**
LocalStack isn't running. Check `docker ps` and review container logs:
```bash
docker compose -f local-dev/docker-compose.yml logs
```

**`yarn serve` fails with engine incompatibility error**
Always use `--ignore-engines`:
```bash
yarn serve --ignore-engines
```
Or set this globally in your yarnrc: `ignore-engines true`

**Images in the gallery return 404**
The S3 bucket may be empty. Either run the migration (step 7 above) or upload an image through the admin panel (navigate to `/admin`).

**local-server.js crashes on startup**
Make sure you've run `npm install` in the `backend/` directory. The Lambda handlers depend on AWS SDK v3 packages.
