'use strict';
const express = require('express');
const router  = express.Router();
const { verifyWebhook, handleWebhook, handleFlowEndpoint } = require('../controllers/whatsappController');

// Meta webhook challenge verification (GET)
router.get('/webhook', verifyWebhook);

// Incoming messages + flow completion (POST)
router.post('/webhook', handleWebhook);

// Encrypted Flow data_exchange endpoint (POST)
router.post('/flow-endpoint', handleFlowEndpoint);
router.post('/glamour-flow-endpoint', handleFlowEndpoint);

module.exports = router;
