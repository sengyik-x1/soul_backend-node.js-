const Client = require('../model/Client');
const User = require('../model/User');
const Appointment = require('../model/Appointment');
//const Payment = require('../model/Payment');
const MembershipPackage = require('../model/MembershipPackages');
//const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createClient = async (req, res) => {
    const {uid, email} = req.body;
    console.log("The req body: " + req.body);
    if (!uid || !email) {
        console.log('uid and email are required');
        return res.status(400).json({ error: 'uid and email are required' });
      }
    

    try {
        // // Create user in Firebase Authentication
        // const userRecord = await admin.auth().createUser({
        //     uid,
        //     password,
        //     // emailVerified: false, // Email verification required
        //     // displayName: name,
        // });

        // // Send email verification link
        // const verificationLink = await admin.auth().generateEmailVerificationLink(email);
        // // Here, send the verificationLink via email using Nodemailer or any email service

        // Save user to MongoDB
        const newUser = new User({
            uid,
            email,
            role: 'client',
        });

        const savedUser = await newUser.save();
        console.log(`User record created for email: ${email}`);
        await Client.create({ client_uid: newUser.uid , email: newUser.email});
        console.log(`Client record created for user: ${newUser.email}`);

        res.status(201).json({ message: 'Client registered successfully.'});
    } catch (error) {
        console.error('Error registering user:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
} 
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
        // if(membership != null){
        //     client.membership = membership;
        // }
       

        await client.save();
        console.log('Client details updated successfully');
        res.status(200).json(client);
} catch (error) {
    console.error('Error updating client details:', error.message);
    res.status(500).json({ error: 'Internal server error' });
}
}

// const updateClientMembership = async (req, res) {
//     const {client_uid, membership} = req.body;
//     try {
//         const client = await Client.findOne({client_uid});
//         if(!client){
//             return res.status(404).json({error: 'Client not found'});
//         }

//         if(!membership || !membership.type?.id){
//             return res.status(400).json({error: 'Invalid membership data'});
//         }

//         client.membership = 
//         client.membership = membership;
//         await client.save();
//         console.log('Client membership updated successfully');
//         res.status(200).json(client);
//     }
// }

const getClientAppointments = async (req, res) => {
    const { client_uid } = req.params;
    try {
        const client = await Client.findOne({
            client_uid
        });

        if (!client) {
            return res.status(404).json({ error: 'Client not found' });
        }

        const appointments = await Appointment.find({
            clientId: client._id,
            //status: 'confirmed'
        })
        .populate({
            path: 'clientId',
            populate: {
              path: 'membership.type',
              model: 'MembershipPackage'
            }
          })
        //   .populate({
        //     path: 'clientId',
        //     populate: {
        //       path: 'membership.purchaseHistory.packageType',
        //       model: 'MembershipPackage'
        //     }
        //   })
          .populate('trainerId');
        console.log('Client\'s Appointments fetched successfully');
        res.status(200).json(appointments);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

//client update profile url
const updateClientProfileUrl = async (req, res) => {

    const { clientUid, profileUrl } = req.body;

  if (!clientUid || !profileUrl) {
    console.log('Client ID and profile URL are required');
    return res.status(400).json({ error: 'Client ID and profile URL are required' });
  }

  try {
    const client = await Client.findOne({ client_uid: clientUid });
    if (!client) {
      console.log('Client not found');
      return res.status(404).json({ error: 'Client not found' });
    }
    client.profileUrl = profileUrl;
    await client.save();
    console.log('Client profile URL updated successfully');
    res.status(200).json({ message: 'Profile URL updated successfully', client });
  } catch (error) {
    console.error('Error updating client profile URL:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
}
    



module.exports = {createClient, getClientDetails, updateClientDetails, getClientAppointments, updateClientProfileUrl};