const logger = require('../config/logger');

// Logs one structured line per request once the response is sent, including
// method, path, status code and latency. The requestId is added automatically
// by the logger's requestId format.
const requestLogger = (req, res, next) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip
    };
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${meta.durationMs}ms`;
    // 5xx → error, 4xx (except 401/404) → warn, 2xx/3xx/401/404 → http
    if (res.statusCode >= 500) logger.error(message, meta);
    else if (res.statusCode >= 400 && res.statusCode !== 401 && res.statusCode !== 404) logger.warn(message, meta);
    else logger.http(message, meta);
  });

  next();
};

module.exports = requestLogger;
