'use strict';

const { GetCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');
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

    // Delete from S3 first
    await s3Client.send(new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: result.Item.s3Key
    }));

    // Delete from DynamoDB
    await docClient.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { imageId }
    }));

    return ok({ imageId, deleted: true });
  } catch (err) {
    console.error('deleteImage error:', err);
    return serverError();
  }
};
