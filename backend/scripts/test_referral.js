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
  return { payload: {
    encrypted_flow_data: Buffer.concat([body, c.getAuthTag()]).toString('base64'),
    encrypted_aes_key: crypto.publicEncrypt({ key: pub, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, aesKey).toString('base64'),
    initial_vector: iv.toString('base64')
  }, aesKey, iv };
};
const dec = (b64, aesKey, iv) => {
  const f = Buffer.from(iv.map(b => ~b)), buf = Buffer.from(b64, 'base64');
  const d = crypto.createDecipheriv('aes-128-gcm', aesKey, f);
  d.setAuthTag(buf.subarray(-16));
  return Buffer.concat([d.update(buf.subarray(0, -16)), d.final()]).toString('utf8');
};

(async () => {
  const { payload, aesKey, iv } = enc({ version: '3.0', action: 'data_exchange', screen: 'MAIN_MENU_EN', flow_token: 'bjp:918903162114:1', data: { choice: 'referral' } });
  const res = await axios.post(URL, payload, { headers: { 'Content-Type': 'application/json' }, timeout: 15000 });
  const out = JSON.parse(dec(res.data, aesKey, iv));
  console.log('screen:', out.screen);
  console.log(out.data.body);
})().catch(e => console.log('ERR', e.response?.status, e.message));
