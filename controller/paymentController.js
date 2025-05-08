const express = require('express');
const mongoose = require('mongoose');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const PaymentService = require('../services/paymentService');
const Client = require('../model/Client');
const MembershipPackage = require('../model/MembershipPackages');
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const PurchaseHistory = require('../model/PurchaseHistory');

const getFpxBanks = async (req, res) => {
  try {
    // const fpxBanks = await stripe.sources.list({
    //     type: 'fpx',
    //   });
    // console.log('FPX banks fetched successfully: ', fpxBanks.data);
    const elements = stripe.elements();
    const fpxBanks = await elements.create('fpxBank', {
      account_holder_type: 'individual',
    });
    console.log('FPX banks fetched successfully: ', fpxBanks);
    res.json(fpxBanks);
  } catch (error) {
    console.error('Error fetching FPX banks:', error.message);
    res.status(500).json({ error: error.message });
  }
}

const createPaymentIntent = async (req, res) => {
  const { membershipName, clientUid } = req.body;


  // Log the request body
  console.log('Request body:', req.body);

  try {
    if (!membershipName || !clientUid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    // Fetch client by client_uid
    const client = await Client.findOne({ client_uid: clientUid });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    const membershipPackage = await MembershipPackage.findOne({ name: membershipName });
    if (!membershipPackage) {
      return res.status(404).json({ error: 'Membership package not found' });
    }
    console.log('Membership package:', membershipPackage);
    // Fetch membership package and create payment intent
    const paymentIntent = await PaymentService.createPaymentIntent(membershipPackage._id, client._id);
    res.status(200).json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment intent succeeded');
        const paymentIntent = event.data.object;
        const { clientId, membershipPackageId } = paymentIntent.metadata;

        try {

          const clientObjectId = new mongoose.Types.ObjectId(clientId);
          const packageObjectId = new mongoose.Types.ObjectId(membershipPackageId);
          // Fetch the client and membership package
          const [client, membershipPackage] = await Promise.all([
            Client.findById(clientObjectId),
            MembershipPackage.findById(packageObjectId)
          ]);

          if (!client || !membershipPackage) {
            console.error('Client or membership package not found');
            return res.status(404).json({
              error: `${!client ? 'Client' : 'Membership package'} not found`
            });
          }

          // Create purchase history record
          // const purchaseRecord = new PurchaseHistory({
          //   client: client._id,
          //   clientName: client.name,
          //   clientEmail: client.email,
          //   packageType: membershipPackage._id,
          //   packageName: membershipPackage.name,
          //   purchaseDate: new Date(),
          //   points: membershipPackage.points,
          //   amount: paymentIntent.amount / 100, // Convert from cents to dollars
          //   paymentId: paymentIntent.id
          // });

          // Save the purchase record
          // await purchaseRecord.save();
          // console.log(`Created purchase history record: ${purchaseRecord._id}`);



          // If no membership exists, initialize the purchase history array
          // if (!client.membership) {
          //   client.membership = {
          //     purchaseHistory: []
          //   };
          // }

          // Activate the new membership
          await client.activateNewMembership(membershipPackageId, paymentIntent.id);

          console.log(`Updated membership for client ${clientId}`);

          // Save the updated client
          await client.save();

          const io = req.app.get('io');

          // Emit socket event if needed
          io.emit('payment_completed', {
            clientId,
            membershipPackageId,
            status: 'success'
          });
          console.log('Payment completed event emitted');
        } catch (error) {
          console.error('Error processing successful payment:', error);
          // Still send 200 to Stripe but log the error
          return res.status(200).json({
            received: true,
            error: error.message
          });
        }
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        // await Payment.findOneAndUpdate(
        //   { paymentIntentId: failedPayment.id },
        //   { status: 'failed', updatedAt: new Date() }
        // );
        console.log('Payment failed');
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}

module.exports = { createPaymentIntent, handleStripeWebhook, getFpxBanks };

