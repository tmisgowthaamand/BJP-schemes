'use strict';
const axios = require('axios');
const logger = require('../config/logger');

const BASE_URL = 'https://graph.facebook.com/v19.0';
const PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const TOKEN    = process.env.WHATSAPP_TOKEN;

// BJP banner shown as the image header of the flow trigger message (public HTTPS URL).
// IMPORTANT: Meta WhatsApp Cloud API only accepts JPEG or PNG.
const BANNER_URL = process.env.WA_BANNER_URL ||
  'https://res.cloudinary.com/dkjrdntf/image/upload/w_800,f_jpg/v1785563946/bjp_schemes/bjp_final_banner.jpg';

// ── Core send helper ──────────────────────────────────────────────────────────
const _post = async (payload) => {
  try {
    const res = await axios.post(
      `${BASE_URL}/${PHONE_ID}/messages`,
      payload,
      { headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' } }
    );
    return res.data;
  } catch (err) {
    const detail = err.response?.data || err.message;
    logger.error('[WhatsApp API Error]', { detail, payload: JSON.stringify(payload).slice(0, 300) });
    throw err;
  }
};

// ── Send plain text message ───────────────────────────────────────────────────
const sendText = async (to, text) => {
  return _post({
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'text',
    text: { body: text, preview_url: false }
  });
};

// ── Trigger a WhatsApp Flow (opens native UI inside WhatsApp) ─────────────────
/**
 * @param {string} to          - Recipient phone number (+91XXXXXXXXXX)
 * @param {string} flowId      - Meta Flow ID
 * @param {string} screenId    - First screen to show
 * @param {object} screenData  - Initial data passed into the flow screen
 * @param {string} ctaLabel    - Button label shown in the chat (max 20 chars)
 * @param {string} bodyText    - Message body shown above the CTA button
 */
const triggerFlow = async (to, flowId, screenId, screenData = {}, ctaLabel = 'Open Portal', bodyText = '') => {
  // Meta requires flow_action_payload.data to be a non-empty "dynamic_object".
  // If the target screen has no data model, omit `data` entirely.
  const payload = { screen: screenId };
  if (screenData && Object.keys(screenData).length > 0) {
    payload.data = screenData;
  }

  return _post({
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'flow',
      // Image header — the BJP banner shows in the chat bubble before opening the flow.
      // WhatsApp accepts only JPEG/PNG. BANNER_URL must be a plain public JPEG/PNG URL.
      header: { type: 'image', image: { link: BANNER_URL } },
      body:   { text: bodyText || 'Tap the button below to open the portal.' },
      footer: { text: 'BJP Tamil Nadu — Central Schemes' },
      action: {
        name: 'flow',
        parameters: {
          flow_message_version: '3',
          // flow_token embeds the recipient's mobile so the encrypted
          // endpoint can identify the user on each data_exchange call.
          flow_token:           `bjp:${to}:${Date.now()}`,
          flow_id:              flowId,
          flow_cta:             ctaLabel,
          flow_action:          'navigate',
          flow_action_payload:  payload
        }
      }
    }
  });
};

// ── Send a pre-approved template message ─────────────────────────────────────
/**
 * Used for proactive status updates from admin → voter
 * Template must be pre-approved in Meta Business Manager
 */
const sendTemplate = async (to, templateName, langCode, components = []) => {
  return _post({
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name:     templateName,
      language: { code: langCode },
      components
    }
  });
};

// ── Upload Flow JSON to Meta ─────────────────────────────────────────────────
/**
 * Upload or replace flow JSON assets to a given Flow ID.
 * Called once during deployment / flow updates.
 */
const uploadFlowJson = async (flowId, flowJsonString) => {
  const FormData = require('form-data');
  const form = new FormData();
  form.append('file', Buffer.from(flowJsonString), {
    filename:    'flow.json',
    contentType: 'application/json'
  });
  form.append('name', 'flow.json');
  form.append('asset_type', 'FLOW_JSON');
  form.append('messaging_product', 'whatsapp');

  const res = await axios.post(
    `${BASE_URL}/${flowId}/assets`,
    form,
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        ...form.getHeaders()
      }
    }
  );
  return res.data;
};

module.exports = { sendText, triggerFlow, sendTemplate, uploadFlowJson };
