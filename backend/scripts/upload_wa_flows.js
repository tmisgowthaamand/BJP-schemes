'use strict';
/**
 * One-time script: uploads Flow JSON assets to the two Meta WhatsApp Flows.
 * Run:  node scripts/upload_wa_flows.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

const TOKEN = process.env.WHATSAPP_TOKEN;
const FLOWS = [
  { id: process.env.WA_FLOW_ID_ONBOARDING, file: 'onboardingFlow.json', name: 'onboarding' },
  { id: process.env.WA_FLOW_ID_PORTAL,     file: 'portalFlow.json',     name: 'portal' }
];

const upload = async (flowId, filePath, label) => {
  const json = fs.readFileSync(filePath, 'utf8');
  const form = new FormData();
  form.append('file', Buffer.from(json), { filename: 'flow.json', contentType: 'application/json' });
  form.append('name', 'flow.json');
  form.append('asset_type', 'FLOW_JSON');
  form.append('messaging_product', 'whatsapp');

  try {
    const res = await axios.post(
      `https://graph.facebook.com/v19.0/${flowId}/assets`,
      form,
      { headers: { Authorization: `Bearer ${TOKEN}`, ...form.getHeaders() } }
    );
    const errs = res.data.validation_errors || [];
    if (errs.length) {
      console.log(`[${label}] uploaded WITH validation errors:`);
      errs.forEach(e => console.log(`   - ${e.error}: ${e.message}`));
    } else {
      console.log(`[${label}] ✅ uploaded clean — no validation errors`);
    }
  } catch (err) {
    console.error(`[${label}] ❌ upload failed:`, err.response?.data || err.message);
  }
};

(async () => {
  for (const f of FLOWS) {
    if (!f.id) { console.error(`Missing flow id for ${f.name}`); continue; }
    await upload(f.id, path.join(__dirname, '..', 'flows', f.file), f.name);
  }
})();
