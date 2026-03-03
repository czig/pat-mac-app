'use strict';

const { PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client } = require('@aws-sdk/client-s3');
const { PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const { docClient } = require('./shared/dynamodb');
const { created, badRequest, serverError } = require('./shared/responses');
const { sanitizeFilename, validateImageInput } = require('./shared/validate');

const TABLE_NAME = process.env.DYNAMODB_TABLE;
const BUCKET_NAME = process.env.S3_BUCKET;

const s3Config = {
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED'
};
if (process.env.LOCALSTACK_ENDPOINT) {
  s3Config.endpoint = process.env.LOCALSTACK_ENDPOINT;
  s3Config.region = 'us-east-1';
  s3Config.credentials = { accessKeyId: 'test', secretAccessKey: 'test' };
  s3Config.forcePathStyle = true;
}
const s3Client = new S3Client(s3Config);

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const validationError = validateImageInput(body);
    if (validationError) return badRequest(validationError);

    const { title, alt, filename, contentType } = body;

    // Get current max order for new item ordering
    const scan = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' },
      Select: 'COUNT'
    }));
    const nextOrder = (scan.Count || 0);

    const imageId = uuidv4();
    const safeFilename = sanitizeFilename(filename);
    const s3Key = `images/${imageId}/${safeFilename}`;
    const pendingExpiry = Math.floor(Date.now() / 1000) + 3600;

    await docClient.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        imageId,
        title,
        alt,
        s3Key,
        order: nextOrder,
        uploadedAt: new Date().toISOString(),
        status: 'pending',
        pendingExpiry
      }
    }));

    const uploadUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: s3Key,
        ContentType: contentType
      }),
      { expiresIn: 900 }
    );

    return created({ imageId, uploadUrl });
  } catch (err) {
    console.error('createImage error:', err);
    return serverError();
  }
};
