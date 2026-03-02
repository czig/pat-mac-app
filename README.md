# Pat Mac's Copper Works

Portfolio site for a copper artist at [patmacscopperworks.com](https://patmacscopperworks.com). Built with Vue 2, Vuetify 2, and AWS (Cognito, S3, CloudFront, DynamoDB, Lambda, API Gateway).

## Quick start

```bash
cp .env.example .env       # fill in your values (see docs/aws-setup.md)
yarn install --ignore-engines
yarn serve                 # http://localhost:8080
```

## Commands

| Command | Description |
|---------|-------------|
| `yarn serve` | Dev server with hot-reload at `localhost:8080` |
| `yarn build` | Production build → `/dist` |
| `yarn test:unit` | Run unit tests |
| `yarn test:unit --grep "name"` | Run a single test by name |
| `yarn deploy` | Sync `/dist` to S3 (requires AWS profile `caleb`) |
| `yarn local-server` | Start local Express API server on `localhost:3001` |

## Documentation

- [Local Development](docs/local-dev.md) — Running against LocalStack without needing real AWS
- [AWS Setup](docs/aws-setup.md) — Step-by-step instructions for provisioning all AWS resources
- [Deployment](docs/deployment.md) — Deploying the frontend and backend to production
- [Testing](docs/testing.md) — Running and writing tests

## Project structure

```
src/
  auth/cognito.js          # amazon-cognito-identity-js wrapper
  stores/auth.js           # Vuex auth module (user, loading, error, initialized)
  stores/main.js           # Vuex root store
  router/index.js          # Routes + auth navigation guard
  services/api.js          # Axios client with Cognito JWT interceptor
  services/images.js       # Image API wrapper
  components/
    login.vue              # Admin sign-in page
    gallery.vue            # Public gallery (fetches from API)
    admin/
      AdminDashboard.vue   # Tabbed admin UI
      ImageUpload.vue      # Presigned-URL upload flow
      ImageManager.vue     # Drag-to-reorder + delete
backend/
  getImages.js             # GET /images (public)
  createImage.js           # POST /images (auth)
  confirmUpload.js         # PUT /images/{id}/confirm (auth)
  deleteImage.js           # DELETE /images/{id} (auth)
  reorderImages.js         # PUT /images/reorder (auth)
  shared/                  # DynamoDB client, response helpers, input validation
infrastructure/
  main.yaml                # Root CloudFormation stack
  dynamodb.yaml            # DynamoDB table
  iam.yaml                 # Lambda execution role
  lambda.yaml              # Lambda functions
  api-gateway.yaml         # REST API + Cognito authorizer + usage plan
  cloudfront-headers.yaml  # Security response headers policy
local-dev/
  docker-compose.yml       # LocalStack (S3 + DynamoDB)
  setup.sh                 # Create local table and bucket
  local-server.js          # Express server simulating API Gateway
scripts/
  migrate-images.js        # One-time migration of static assets to S3+DynamoDB
```

## Environment variables

Copy `.env.example` to `.env` and fill in your values:

```
VUE_APP_COGNITO_USER_POOL_ID=us-east-1_REPLACE_ME
VUE_APP_COGNITO_CLIENT_ID=REPLACE_ME
VUE_APP_API_BASE_URL=https://REPLACE_ME.execute-api.us-east-1.amazonaws.com/prod
VUE_APP_CLOUDFRONT_URL=https://patmacscopperworks.com
```

See [docs/aws-setup.md](docs/aws-setup.md) for where to find these values.
