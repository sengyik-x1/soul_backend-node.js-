const express = require('express');
const {createPaymentIntent, handleStripeWebhook, getFpxBanks} = require('../controller/paymentController');
const router = express.Router();
const authenticateFirebaseToken = require('../middlewares/authMiddleware');

router.get('/fpx-banks',authenticateFirebaseToken, getFpxBanks);
router.post('/create', authenticateFirebaseToken, createPaymentIntent);
router.post('/webhook', express.raw({type: 'application/json'}),  handleStripeWebhook);

module.exports = router;