// Validates the access control on the live-tracking endpoints.
// (Data-shape correctness is verified live against MongoDB; these tests focus
// on the security gates, which need no database.)

const test = require('node:test');
const assert = require('node:assert');
const app = require('../server'); // exported app; no DB connection on import

const listen = (a) => new Promise((resolve) => { const s = a.listen(0, () => resolve(s)); });
const baseUrl = (s) => `http://127.0.0.1:${s.address().port}`;

test('public live view is rejected without a token', async () => {
  const server = await listen(app);
  try {
    const res = await fetch(`${baseUrl(server)}/api/admin/live-public`);
    assert.strictEqual(res.status, 403);
    const body = await res.json();
    assert.strictEqual(body.success, false);
  } finally {
    server.close();
  }
});

test('public live view is rejected with a wrong token', async () => {
  const server = await listen(app);
  try {
    const res = await fetch(`${baseUrl(server)}/api/admin/live-public?token=not-the-real-token`);
    assert.strictEqual(res.status, 403);
  } finally {
    server.close();
  }
});

test('authed live-stats requires an admin token', async () => {
  const server = await listen(app);
  try {
    const res = await fetch(`${baseUrl(server)}/api/admin/live-stats`);
    assert.strictEqual(res.status, 401);
  } finally {
    server.close();
  }
});

test('a valid public token passes the security gate (not 403/503)', async () => {
  const token = process.env.LIVE_SHARE_TOKEN;
  assert.ok(token, 'LIVE_SHARE_TOKEN should be set in .env for this test');
  const server = await listen(app);
  try {
    const res = await fetch(`${baseUrl(server)}/api/admin/live-public?token=${token}`);
    // With a correct token the request clears the gate. It then reaches the DB
    // layer (200 with data when Mongo is connected, 500 otherwise) — either way
    // it must NOT be a gate rejection.
    assert.notStrictEqual(res.status, 403);
    assert.notStrictEqual(res.status, 503);
  } finally {
    server.close();
  }
});
