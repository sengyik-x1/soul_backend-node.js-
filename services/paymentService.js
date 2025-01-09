const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../model/Payment');
const Client = require('../model/Client');
const MembershipPackage = require('../model/MembershipPackages');

class PaymentService {

    async createPaymentIntent(membershipType, clientId) {
        const client = await Client.findById(clientId);
        if (!client) {
            throw new Error('Client not found');
        }
        const membershipPackage = await MembershipPackage.findOne({ type: membershipType });
        if (!membershipPackage) {
            throw new Error('Membership package not found');
        }

        if (client.isEligibleForMembership()) {
            const amount = membershipPackage.price * 100; // Convert to cents

            try {
                // Create payment intent with Stripe
                const paymentIntent = await stripe.paymentIntents.create({
                    payment_method_types: ['fpx'],
                    amount: amount,
                    currency: 'myr',
                    metadata: {
                        clientId: clientId.toString(),
                        membershipType: membershipPackage.name,
                        points: membershipPackage.points.toString(),
                        durationMonths: membershipPackage.durationMonths.toString()
                    }
                });

                res.status(200).send({ clientSecret: paymentIntent.client_secret });
            } catch (error) {
                res.status(500).send({ error: error.message });
                throw new Error('Failed to create payment intent');
            }
           
        }

    }

//confirm the payment on the client


}