'use strict';
require('dotenv').config();
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const pub = fs.readFileSync(path.join(__dirname, '..', 'flow_public.pem'), 'utf8');
const URL = 'http://localhost:5000/api/whatsapp/flow-endpoint';

const enc = (obj) => {
  const aesKey = crypto.randomBytes(16), iv = crypto.randomBytes(16);
  const c = crypto.createCipheriv('aes-128-gcm', aesKey, iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  const tag = c.getAuthTag();
  return {
    payload: {
      encrypted_flow_data: Buffer.concat([body, tag]).toString('base64'),
      encrypted_aes_key: crypto.publicEncrypt({ key: pub, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, aesKey).toString('base64'),
      initial_vector: iv.toString('base64')
    }, aesKey, iv
  };
};
const dec = (b64, aesKey, iv) => {
  const f = Buffer.from(iv.map(b => ~b)), buf = Buffer.from(b64, 'base64');
  const d = crypto.createDecipheriv('aes-128-gcm', aesKey, buf.subarray(-16) && f);
  d.setAuthTag(buf.subarray(-16));
  return Buffer.concat([d.update(buf.subarray(0, -16)), d.final()]).toString('utf8');
};

const call = async (reqObj, label) => {
  const { payload, aesKey, iv } = enc(reqObj);
  const res = await axios.post(URL, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
  const out = dec(res.data, aesKey, iv);
  console.log(`\n[${label}] ->\n${out}`);
  return JSON.parse(out);
};

(async () => {
  const token = 'bjp:918903162114:1'; // registered number (web: 8903162114)
  // 1. Language select → should return WELCOME_BACK (registered)
  await call({ version: '3.0', action: 'data_exchange', screen: 'LANGUAGE_SELECT', flow_token: token, data: { lang: 'en' } }, 'LANGUAGE_SELECT (registered, en)');

  const token2 = 'bjp:919999888777:2'; // random new number
  // 2. New user language select → LOCKED_MENU
  await call({ version: '3.0', action: 'data_exchange', screen: 'LANGUAGE_SELECT', flow_token: token2, data: { lang: 'ta' } }, 'LANGUAGE_SELECT (new, ta)');
})().catch(e => console.log('ERR:', e.response?.status, e.response?.data || e.message));

// Extra checks (run: node scripts/test_data_exchange2.js style) — inline:
(async () => {
  const token = 'bjp:918903162114:9';
  try {
    await call({ version:'3.0', action:'data_exchange', screen:'MAIN_MENU', flow_token: token, data:{ action:'profile' } }, 'MAIN_MENU profile');
    const r = await call({ version:'3.0', action:'data_exchange', screen:'MY_SCHEMES', flow_token: token, data:{ go:'apply' } }, 'MY_SCHEMES -> APPLY (scheme count)');
    console.log('\nSCHEME OPTIONS COUNT:', (r.data.options||[]).length);
  } catch(e){ console.log('ERR2:', e.response?.status, e.message); }
})();
