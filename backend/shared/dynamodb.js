'use strict';

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient } = require('@aws-sdk/lib-dynamodb');

const clientConfig = {};

if (process.env.LOCALSTACK_ENDPOINT) {
  clientConfig.endpoint = process.env.LOCALSTACK_ENDPOINT;
  clientConfig.region = 'us-east-1';
  clientConfig.credentials = {
    accessKeyId: 'test',
    secretAccessKey: 'test'
  };
}

const client = new DynamoDBClient(clientConfig);
const docClient = DynamoDBDocumentClient.from(client);

module.exports = { docClient };
