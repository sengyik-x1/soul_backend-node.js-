const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Client = require('../model/Client');
const MembershipPackage = require('../model/MembershipPackages');
const mongoose = require('mongoose');

async function createPaymentIntent(membershipPackageId, clientId) {
  // Log the membershipPackageId and clientId
  console.log('membershipPackageId:', membershipPackageId);
  console.log('clientId:', clientId);

  // Validate membershipPackageId
  if (!mongoose.Types.ObjectId.isValid(membershipPackageId)) {
    throw new Error('Invalid membership package ID');
  }

  const client = await Client.findById(clientId);
  if (!client) {
    throw new Error('Client not found');
  }

  const membershipPackage = await MembershipPackage.findById(membershipPackageId);
  if (!membershipPackage) {
    throw new Error('Membership package not found');
  }

  if (client.isEligibleForNewMembership()) {
    const amount = membershipPackage.price * 100; // Convert to cents

    try {
      // Create payment intent with Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'myr',
        metadata: {
          clientId: client._id.toString(),
          durationMonths: membershipPackage.durationMonths.toString(),
          membershipPackageId: membershipPackage._id.toString(),
          paymentType: 'card',
          points: membershipPackage.points.toString()
        }
      });

      console.log('Payment intent created successfully', paymentIntent);
      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Error creating payment intent');
    }
  } else {
    throw new Error('Client is not eligible for membership');
  }
}

module.exports = {
  createPaymentIntent,
};