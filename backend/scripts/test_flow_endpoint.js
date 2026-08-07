'use strict';
/**
 * Simulates Meta's encrypted health-check ping to the flow-endpoint.
 * Tests both localhost and the ngrok URL.
 */
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const pub = fs.readFileSync(path.join(__dirname, '..', 'flow_public.pem'), 'utf8');

const buildEncryptedPing = () => {
  const aesKey = crypto.randomBytes(16);
  const iv     = crypto.randomBytes(16);
  const reqObj = { version: '3.0', action: 'ping', flow_token: 'bjp:919000000000:1' };

  const cipher = crypto.createCipheriv('aes-128-gcm', aesKey, iv);
  const enc = Buffer.concat([cipher.update(JSON.stringify(reqObj), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    payload: {
      encrypted_flow_data: Buffer.concat([enc, tag]).toString('base64'),
      encrypted_aes_key: crypto.publicEncrypt(
        { key: pub, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' },
        aesKey
      ).toString('base64'),
      initial_vector: iv.toString('base64')
    },
    aesKey, iv
  };
};

const decryptResp = (b64, aesKey, iv) => {
  const flipped = Buffer.from(iv.map(b => ~b));
  const buf = Buffer.from(b64, 'base64');
  const tag = buf.subarray(-16), body = buf.subarray(0, -16);
  const d = crypto.createDecipheriv('aes-128-gcm', aesKey, flipped);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString('utf8');
};

const test = async (url, label) => {
  const { payload, aesKey, iv } = buildEncryptedPing();
  try {
    const res = await axios.post(url, payload, {
      timeout: 10000,
      headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': '1' }
    });
    const decrypted = decryptResp(res.data, aesKey, iv);
    console.log(`[${label}] ✅ status ${res.status} — decrypted: ${decrypted}`);
  } catch (err) {
    const d = err.response?.data;
    console.log(`[${label}] ❌ status ${err.response?.status} — ${typeof d === 'string' ? d.slice(0, 200) : JSON.stringify(d) || err.code || err.message}`);
  }
};

(async () => {
  await test('http://localhost:5000/api/whatsapp/flow-endpoint', 'localhost');
  await test(process.env.NGROK_URL + '/api/whatsapp/flow-endpoint', 'ngrok');
})();
