'use strict';
/**
 * Publishes the two WhatsApp Flows. Meta health-checks the endpoint_uri
 * during publish, so the backend server + ngrok tunnel MUST be live first.
 * Run:  node scripts/publish_wa_flows.js
 */
require('dotenv').config();
const axios = require('axios');

const TOKEN = process.env.WHATSAPP_TOKEN;
const FLOWS = [
  { id: process.env.WA_FLOW_ID_ONBOARDING, name: 'onboarding' },
  { id: process.env.WA_FLOW_ID_PORTAL,     name: 'portal' }
];

(async () => {
  for (const f of FLOWS) {
    if (!f.id) { console.error(`Missing flow id for ${f.name}`); continue; }
    try {
      const res = await axios.post(
        `https://graph.facebook.com/v19.0/${f.id}/publish`,
        {},
        { headers: { Authorization: `Bearer ${TOKEN}` } }
      );
      console.log(`[${f.name}] ✅ published:`, JSON.stringify(res.data));
    } catch (err) {
      console.error(`[${f.name}] ❌ publish failed:`, JSON.stringify(err.response?.data || err.message));
    }
  }
})();
