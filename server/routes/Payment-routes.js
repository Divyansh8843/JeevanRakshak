const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { createCheckoutSession, webhook } = require('../controllers/payment-controller');

// Stripe requires the raw body for webhook signature verification
router.post('/payments/webhook',
  bodyParser.raw({ type: 'application/json' }),
  webhook
);

// For normal JSON endpoints use standard parser
router.post('/payments/create-checkout-session', express.json(), createCheckoutSession);

module.exports = router;
