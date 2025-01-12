const Client = require('../model/Client');
//const Payment = require('../model/Payment');
const MembershipPackage = require('../model/MembershipPackages');
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


const getClientDetails = async (req, res) => {
    const { client_uid } = req.params;
    try {
        // First find the client
        let client = await Client.findOne({ client_uid })
                               .populate('membership.type');

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        // Handle case where client exists but membership or membership.type is null
        if (client.membership && client.membership.type === null) {
            // You can either:
            // 1. Leave it as null (which your frontend should handle)
            console.log('Client has membership but type is null');
            
            // OR
            // 2. Set some default values
            client.membership.type = {
                _id: null,
                name: 'No Package',
                price: 0,
                points: 0,
                durationMonths: 0
            };
        }

        console.log('Client details fetched successfully');
        res.status(200).json(client);


} catch (error) {
    console.error('Error fetching client details:', error.message);
    res.status(500).json({ error: 'Internal server error' });
}
}

const updateClientDetails = async (req, res) => {
    const { client_uid } = req.params;
    const { name, email, gender, age, height, weight, bmi, healthCondition, goals, membership } = req.body;

    try {
        const client = await Client.findOne({
            client_uid
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        client.name = name;
        client.email = email;
        client.gender = gender;
        client.age = age;
        client.height = height;
        client.weight = weight;
        client.bmi = bmi;
        client.healthCondition = healthCondition;
        client.goals = goals;
        if(membership != null){
            client.membership = membership;
        }
       

        await client.save();
        console.log('Client details updated successfully');
        res.status(200).json(client);
} catch (error) {
    console.error('Error updating client details:', error.message);
    res.status(500).json({ error: 'Internal server error' });
}

}

module.exports = { getClientDetails, updateClientDetails };