'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const logger = require('../config/logger');

/**
 * Meta WhatsApp Flow Endpoint encryption (per official spec).
 * https://developers.facebook.com/docs/whatsapp/flows/reference/flowsencryption
 *
 * Request from Meta contains:
 *   { encrypted_flow_data, encrypted_aes_key, initial_vector }  (all base64)
 *
 * Steps:
 *   1. RSA-OAEP(SHA-256) decrypt encrypted_aes_key using our PRIVATE key → AES key
 *   2. AES-128-GCM decrypt encrypted_flow_data using AES key + IV → JSON request
 *   3. Build response object
 *   4. AES-128-GCM encrypt response using SAME AES key + FLIPPED IV
 *   5. Return base64 string (raw body)
 */

let _privateKey = null;

const getPrivateKey = () => {
  if (_privateKey) return _privateKey;

  // 1. First check process.env.WA_FLOW_PRIVATE_KEY_PEM (for production platforms like Render)
  if (process.env.WA_FLOW_PRIVATE_KEY_PEM && String(process.env.WA_FLOW_PRIVATE_KEY_PEM).trim()) {
    const rawPem = process.env.WA_FLOW_PRIVATE_KEY_PEM.replace(/\\n/g, '\n');
    const passphrase = process.env.WA_FLOW_PRIVATE_KEY_PASSPHRASE || undefined;
    _privateKey = crypto.createPrivateKey({ key: rawPem, passphrase });
    return _privateKey;
  }

  // 2. Fallback to file on disk (for local dev)
  const file = process.env.WA_FLOW_PRIVATE_KEY_FILE || 'flow_private.pem';
  const filePath = path.join(__dirname, '..', file);
  if (!fs.existsSync(filePath)) {
    logger.error('❌ [flowCrypto] Critical error: RSA Private key missing!', {
      filePath,
      hint: 'Add WA_FLOW_PRIVATE_KEY_PEM to your Render Environment Variables.'
    });
    throw new Error(`RSA Private key missing! Neither process.env.WA_FLOW_PRIVATE_KEY_PEM nor file at '${filePath}' exists.`);
  }

  const pem = fs.readFileSync(filePath, 'utf8');
  const passphrase = process.env.WA_FLOW_PRIVATE_KEY_PASSPHRASE || undefined;
  _privateKey = crypto.createPrivateKey({ key: pem, passphrase });
  return _privateKey;
};

// ── Decrypt an incoming Meta flow request ─────────────────────────────────────
const decryptRequest = (body) => {
  const { encrypted_flow_data, encrypted_aes_key, initial_vector } = body;

  const privateKey = getPrivateKey();

  // 1. Decrypt the AES key with our RSA private key (OAEP + SHA-256)
  const aesKey = crypto.privateDecrypt(
    {
      key: privateKey,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256'
    },
    Buffer.from(encrypted_aes_key, 'base64')
  );

  // 2. Decrypt the flow data with AES-GCM
  const flowDataBuffer = Buffer.from(encrypted_flow_data, 'base64');
  const initialVector  = Buffer.from(initial_vector, 'base64');

  const TAG_LENGTH = 16;
  const encryptedBody = flowDataBuffer.subarray(0, -TAG_LENGTH);
  const authTag       = flowDataBuffer.subarray(-TAG_LENGTH);

  const decipher = crypto.createDecipheriv('aes-128-gcm', aesKey, initialVector);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedBody),
    decipher.final()
  ]);

  return {
    decryptedBody: JSON.parse(decrypted.toString('utf-8')),
    aesKeyBuffer:  aesKey,
    initialVectorBuffer: initialVector
  };
};

// ── Encrypt the response back to Meta ────────────────────────────────────────
const encryptResponse = (response, aesKeyBuffer, initialVectorBuffer) => {
  // Flip (bitwise NOT) every byte of the IV per Meta spec
  const flippedIv = Buffer.from(initialVectorBuffer.map((b) => ~b));

  const cipher = crypto.createCipheriv('aes-128-gcm', aesKeyBuffer, flippedIv);

  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(response), 'utf-8'),
    cipher.final(),
    cipher.getAuthTag()
  ]);

  return encrypted.toString('base64');
};

module.exports = { decryptRequest, encryptResponse, getPrivateKey };
