'use strict';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body)
  };
}

module.exports = {
  ok: body => response(200, body),
  created: body => response(201, body),
  badRequest: message => response(400, { message }),
  notFound: message => response(404, { message: message || 'Not found' }),
  serverError: message => response(500, { message: message || 'Internal server error' })
};
