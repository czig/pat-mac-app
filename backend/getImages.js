'use strict';

const { ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('./shared/dynamodb');
const { ok, serverError } = require('./shared/responses');

const TABLE_NAME = process.env.DYNAMODB_TABLE;

exports.handler = async () => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: '#status = :active',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: { ':active': 'active' }
    }));

    const images = (result.Items || []).sort((a, b) => a.order - b.order);

    return ok({ images });
  } catch (err) {
    console.error('getImages error:', err);
    return serverError();
  }
};
