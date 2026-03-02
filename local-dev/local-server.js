'use strict';

// Local Express server that simulates API Gateway for local dev.
// Auth is skipped — all routes are accessible without a token.
// Requires LocalStack running with S3 and DynamoDB.

require('dotenv').config({ path: '.env.local' });

const express = require('express');
const cors = require('cors');

// Point Lambda handlers at LocalStack
process.env.LOCALSTACK_ENDPOINT = process.env.LOCALSTACK_ENDPOINT || 'http://localhost:4566';
process.env.DYNAMODB_TABLE = process.env.DYNAMODB_TABLE || 'copper-images-local';
process.env.S3_BUCKET = process.env.S3_BUCKET || 'patmacscopperworks-local';
process.env.ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';

const getImages = require('../backend/getImages');
const createImage = require('../backend/createImage');
const confirmUpload = require('../backend/confirmUpload');
const deleteImage = require('../backend/deleteImage');
const reorderImages = require('../backend/reorderImages');

const app = express();
app.use(cors());
app.use(express.json());

// Simulate API Gateway event shape
function makeEvent(req) {
  return {
    httpMethod: req.method,
    path: req.path,
    pathParameters: req.params,
    queryStringParameters: req.query,
    headers: req.headers,
    body: req.body ? JSON.stringify(req.body) : null
  };
}

async function handle(handlerFn, req, res) {
  const event = makeEvent(req);
  const result = await handlerFn.handler(event);
  res.status(result.statusCode)
     .set(result.headers || {})
     .send(result.body);
}

app.get('/images', (req, res) => handle(getImages, req, res));
app.post('/images', (req, res) => handle(createImage, req, res));
app.put('/images/reorder', (req, res) => handle(reorderImages, req, res));
app.put('/images/:id/confirm', (req, res) => handle(confirmUpload, req, res));
app.delete('/images/:id', (req, res) => handle(deleteImage, req, res));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Local API server running at http://localhost:${PORT}`);
  console.log(`LocalStack endpoint: ${process.env.LOCALSTACK_ENDPOINT}`);
  console.log(`DynamoDB table: ${process.env.DYNAMODB_TABLE}`);
  console.log(`S3 bucket: ${process.env.S3_BUCKET}`);
});
