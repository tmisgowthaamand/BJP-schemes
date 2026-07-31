// End-to-end validation of the Winston logging setup.
// Runs with the built-in Node test runner: `npm test`.
//
// Strategy: attach an in-memory Winston transport to the REAL logger, drive the
// REAL Express app + middleware over HTTP with fetch, and assert on what was
// actually logged and returned. No database is required (server.js exports the
// app without connecting when imported).

const test = require('node:test');
const assert = require('node:assert');
const express = require('express');
const Transport = require('winston-transport');

const logger = require('../config/logger');
const app = require('../server'); // exported app; does not start DB when required
const requestContext = require('../middleware/requestContext');
const requestLogger = require('../middleware/requestLogger');
const { notFound, errorHandler } = require('../middleware/errorHandler');

// ── In-memory transport to capture log records ─────────────────────────────
class MemoryTransport extends Transport {
  constructor(opts) {
    super(opts);
    this.records = [];
  }
  log(info, callback) {
    this.records.push(info);
    setImmediate(callback);
  }
  clear() {
    this.records = [];
  }
}

const memory = new MemoryTransport();
logger.add(memory);

// ── Helpers ────────────────────────────────────────────────────────────────
const listen = (a) => new Promise((resolve) => { const s = a.listen(0, () => resolve(s)); });
const baseUrl = (s) => `http://127.0.0.1:${s.address().port}`;

const waitFor = async (predicate, timeout = 1000, interval = 20) => {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const found = predicate();
    if (found) return found;
    await new Promise((r) => setTimeout(r, interval));
  }
  return predicate();
};

// A small app that uses the REAL middleware plus a route that throws, so we can
// exercise the centralized error handler (the main app's routes need a DB).
const buildErrorApp = () => {
  const a = express();
  a.use(requestContext);
  a.use(express.json());
  a.use(requestLogger);
  a.get('/throw', () => { throw new Error('SUPER_SECRET_INTERNAL_DETAIL'); });
  a.use(notFound);
  a.use(errorHandler);
  return a;
};

// ── Tests ────────────────────────────────────────────────────────────────

test('health endpoint logs an http access line with method, status and latency', async () => {
  memory.clear();
  const server = await listen(app);
  try {
    const res = await fetch(`${baseUrl(server)}/api/health`);
    assert.strictEqual(res.status, 200);

    const rec = await waitFor(() =>
      memory.records.find((r) => r.level === 'http' && String(r.message).includes('/api/health'))
    );
    assert.ok(rec, 'expected an http log record for /api/health');
    assert.strictEqual(rec.method, 'GET');
    assert.strictEqual(rec.status, 200);
    assert.strictEqual(typeof rec.durationMs, 'number');
  } finally {
    server.close();
  }
});

test('a correlation id is generated and the same id appears in the response header and the log', async () => {
  memory.clear();
  const server = await listen(app);
  try {
    const res = await fetch(`${baseUrl(server)}/api/health`);
    const headerId = res.headers.get('x-request-id');
    assert.ok(headerId, 'expected an X-Request-Id response header');

    const rec = await waitFor(() =>
      memory.records.find((r) => r.level === 'http' && r.requestId === headerId)
    );
    assert.ok(rec, 'expected a log record carrying the same requestId as the response header');
  } finally {
    server.close();
  }
});

test('an inbound X-Request-Id is honored end to end', async () => {
  memory.clear();
  const server = await listen(app);
  try {
    const res = await fetch(`${baseUrl(server)}/api/health`, { headers: { 'X-Request-Id': 'trace-123' } });
    assert.strictEqual(res.headers.get('x-request-id'), 'trace-123');

    const rec = await waitFor(() =>
      memory.records.find((r) => r.requestId === 'trace-123')
    );
    assert.ok(rec, 'expected log records to use the inbound requestId');
  } finally {
    server.close();
  }
});

test('unknown routes return a generic 404 with a correlation id and log a warning', async () => {
  memory.clear();
  const server = await listen(app);
  try {
    const res = await fetch(`${baseUrl(server)}/api/does-not-exist`);
    assert.strictEqual(res.status, 404);
    const body = await res.json();
    assert.strictEqual(body.success, false);
    assert.strictEqual(body.message, 'Resource not found');
    assert.ok(body.correlationId, 'expected a correlationId in the 404 body');

    const rec = await waitFor(() =>
      memory.records.find((r) => r.level === 'warn' && String(r.message).includes('Route not found'))
    );
    assert.ok(rec, 'expected a warn log for the missing route');
  } finally {
    server.close();
  }
});

test('unhandled errors are logged with stack but the client only sees a generic message', async () => {
  memory.clear();
  const errorApp = buildErrorApp();
  const server = await listen(errorApp);
  try {
    const res = await fetch(`${baseUrl(server)}/throw`);
    assert.strictEqual(res.status, 500);

    const body = await res.json();
    assert.strictEqual(body.message, 'Something went wrong. Please try again later.');
    assert.ok(body.correlationId, 'expected a correlationId in the error body');
    // The internal detail must NOT leak to the client (audit H-6).
    assert.ok(!JSON.stringify(body).includes('SUPER_SECRET_INTERNAL_DETAIL'), 'internal error detail leaked to client');

    // ...but it MUST be captured server-side, with a stack trace.
    const rec = await waitFor(() =>
      memory.records.find((r) => r.level === 'error' && String(r.message).includes('SUPER_SECRET_INTERNAL_DETAIL'))
    );
    assert.ok(rec, 'expected the error to be logged server-side');
    assert.ok(rec.stack, 'expected a stack trace in the error log');
  } finally {
    server.close();
  }
});

test('secrets are redacted and PII is masked in log metadata', async () => {
  memory.clear();
  logger.info('credential handling test', {
    password: 'p@ssw0rd',
    mobile: '9876543210',
    epicNo: 'ABC1234567',
    district: 'CHENGALPATTU',
    nested: { token: 'super-secret-jwt', note: 'keep' }
  });

  const rec = await waitFor(() => memory.records.find((r) => r.message === 'credential handling test'));
  assert.ok(rec, 'expected the log record to be captured');

  // Secrets fully hidden.
  assert.strictEqual(rec.password, '[REDACTED]');
  assert.strictEqual(rec.nested.token, '[REDACTED]');

  // PII masked (not equal to the raw value, but partially preserved).
  assert.notStrictEqual(rec.mobile, '9876543210');
  assert.match(rec.mobile, /^98\*+10$/);
  assert.notStrictEqual(rec.epicNo, 'ABC1234567');

  // Non-sensitive fields untouched.
  assert.strictEqual(rec.district, 'CHENGALPATTU');
  assert.strictEqual(rec.nested.note, 'keep');
});

test('logging does not mutate the caller original object', async () => {
  memory.clear();
  const original = { password: 'secret', mobile: '9876543210' };
  logger.info('no-mutation test', original);
  // The caller's object must be untouched (we clone before scrubbing).
  assert.strictEqual(original.password, 'secret');
  assert.strictEqual(original.mobile, '9876543210');
});

// Ensure the process exits promptly after tests (winston keeps handles open).
test.after(() => {
  logger.remove(memory);
});
