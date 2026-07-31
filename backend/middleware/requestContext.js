const { randomUUID } = require('crypto');
const { runWithContext } = require('../utils/requestContext');

// Assigns a correlation id to each request and binds it to the async context so
// every log line produced while handling the request carries the same id.
// Honors an inbound `X-Request-Id` header when present (useful behind a proxy).
const requestContext = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || randomUUID();
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  runWithContext({ requestId }, () => next());
};

module.exports = requestContext;
