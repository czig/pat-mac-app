'use strict';

const { TransactWriteCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('./shared/dynamodb');
const { ok, badRequest, serverError } = require('./shared/responses');
const { validateReorderInput } = require('./shared/validate');

const TABLE_NAME = process.env.DYNAMODB_TABLE;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const validationError = validateReorderInput(body);
    if (validationError) return badRequest(validationError);

    const { orderedIds } = body;

    const transactItems = orderedIds.map((imageId, index) => ({
      Update: {
        TableName: TABLE_NAME,
        Key: { imageId },
        UpdateExpression: 'SET #order = :order',
        ExpressionAttributeNames: { '#order': 'order' },
        ExpressionAttributeValues: { ':order': index }
      }
    }));

    await docClient.send(new TransactWriteCommand({ TransactItems: transactItems }));

    return ok({ reordered: orderedIds.length });
  } catch (err) {
    console.error('reorderImages error:', err);
    return serverError();
  }
};
