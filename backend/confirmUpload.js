'use strict';

const { GetCommand, UpdateCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { docClient } = require('./shared/dynamodb');
const { ok, badRequest, notFound, serverError } = require('./shared/responses');

const TABLE_NAME = process.env.DYNAMODB_TABLE;
const BUCKET_NAME = process.env.S3_BUCKET;

const s3Config = {};
if (process.env.LOCALSTACK_ENDPOINT) {
  s3Config.endpoint = process.env.LOCALSTACK_ENDPOINT;
  s3Config.region = 'us-east-1';
  s3Config.credentials = { accessKeyId: 'test', secretAccessKey: 'test' };
  s3Config.forcePathStyle = true;
}
const s3Client = new S3Client(s3Config);

exports.handler = async (event) => {
  try {
    const imageId = event.pathParameters && event.pathParameters.id;
    if (!imageId) return badRequest('imageId is required');

    const result = await docClient.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { imageId }
    }));

    if (!result.Item) return notFound('Image not found');
    if (result.Item.status !== 'pending') return badRequest('Image is not in pending state');

    // Verify S3 upload succeeded
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: BUCKET_NAME,
        Key: result.Item.s3Key
      }));
    } catch {
      return badRequest('S3 upload not found — upload the file before confirming');
    }

    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { imageId },
      UpdateExpression: 'SET #status = :active REMOVE pendingExpiry',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' }
    }));

    return ok({ imageId, status: 'active' });
  } catch (err) {
    console.error('confirmUpload error:', err);
    return serverError();
  }
};
