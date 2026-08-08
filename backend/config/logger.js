const fs = require('fs');
const path = require('path');
const winston = require('winston');
const { getRequestId } = require('../utils/requestContext');

const isProduction = process.env.NODE_ENV === 'production';
// In production (e.g. Render) the filesystem is ephemeral, so we log JSON to
// stdout and let the platform aggregate. File transports are dev-only, or can
// be forced on with LOG_TO_FILE=true for VM / on-prem deployments.
const logToFile = process.env.LOG_TO_FILE === 'true' || !isProduction;

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (logToFile && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// ── Redaction / PII masking ────────────────────────────────────────────────
// Keys whose values are secrets — fully hidden.
const SECRET_KEYS = ['password', 'token', 'jwt', 'authorization', 'apikey', 'api_key', 'secret', 'otp'];
// Keys that are PII — masked but kept partially useful for debugging.
const PII_KEYS = ['mobile', 'phone', 'epicno', 'epic_no', 'votername', 'voter_name', 'name'];

const maskValue = (value) => {
  const str = String(value);
  if (str.length <= 4) return '***';
  return `${str.slice(0, 2)}${'*'.repeat(Math.max(3, str.length - 4))}${str.slice(-2)}`;
};

// Deep clone + scrub so we never mutate the caller's objects.
const scrub = (input, seen = new WeakSet()) => {
  if (input === null || typeof input !== 'object') return input;
  if (seen.has(input)) return '[Circular]';
  seen.add(input);

  if (Array.isArray(input)) return input.map((v) => scrub(v, seen));

  const out = {};
  for (const [key, value] of Object.entries(input)) {
    const lower = key.toLowerCase();
    if (SECRET_KEYS.includes(lower)) {
      out[key] = '[REDACTED]';
    } else if (PII_KEYS.includes(lower) && value != null && typeof value !== 'object') {
      out[key] = maskValue(value);
    } else if (value && typeof value === 'object') {
      out[key] = scrub(value, seen);
    } else {
      out[key] = value;
    }
  }
  return out;
};

// Core fields that are never treated as redactable metadata.
const CORE_FIELDS = new Set(['level', 'message', 'stack', 'timestamp', 'service', 'requestId']);

// Redact secrets / mask PII in the metadata fields. We mutate winston's own
// `info` object in place (so its internal level/message Symbols are preserved),
// but never mutate the caller's objects — nested values are deep-cloned by scrub.
const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (CORE_FIELDS.has(key)) continue;
    const lower = key.toLowerCase();
    const value = info[key];
    if (SECRET_KEYS.includes(lower)) {
      info[key] = '[REDACTED]';
    } else if (PII_KEYS.includes(lower) && value != null && typeof value !== 'object') {
      info[key] = maskValue(value);
    } else if (value && typeof value === 'object') {
      info[key] = scrub(value);
    }
  }
  return info;
});

// Inject the current request's correlation id (if we're inside a request).
const requestIdFormat = winston.format((info) => {
  const requestId = getRequestId();
  if (requestId && !info.requestId) info.requestId = requestId;
  return info;
});

// Logger-level formats apply to EVERY transport (redaction is enforced globally).
const baseFormat = winston.format.combine(
  winston.format.errors({ stack: true }),
  requestIdFormat(),
  redactFormat()
);

// Human-friendly console output for development.
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, stack, requestId, service, ...meta }) => {
    const rid = requestId ? ` (req:${requestId})` : '';
    const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} [${level}]${rid} ${stack || message}${extra}`;
  })
);

// Structured JSON for files and for production stdout.
const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);



const transports = [
  new winston.transports.Console({
    format: isProduction ? jsonFormat : consoleFormat
  })
];

if (logToFile) {
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: jsonFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: jsonFormat,
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5
    })
  );
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'http' : 'debug'),
  levels: winston.config.npm.levels, // includes an `http` level below `info`
  format: baseFormat,
  defaultMeta: { service: 'bjp-nalam-thittam-api' },
  transports,
  exitOnError: false
});

// Handle crashes through the normal logger path (winston's built-in
// exception/rejection handlers don't apply custom transport formats reliably).
// We log with full stack but do not force-exit, matching the app's prior
// behavior of staying up. Register once even if this module is re-required.
if (!global.__bjpCrashHandlersRegistered) {
  global.__bjpCrashHandlersRegistered = true;
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  });
  process.on('unhandledRejection', (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    logger.error('Unhandled rejection', { error: err.message, stack: err.stack });
  });
}

// Stream hook for HTTP request middleware.
logger.stream = {
  write: (message) => logger.http(message.trim())
};

module.exports = logger;
