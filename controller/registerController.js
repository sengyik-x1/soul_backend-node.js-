// const express = require('express');
// const router = express.Router();
// const admin = require('firebase-admin');
// const User = require('../model/User'); // Your Mongoose model

// const registerAccount =  async (req, res) => {
//     const {uid, email} = req.body;

//     try {
//         // Create user in Firebase Authentication
//         const userRecord = await admin.auth().createUser({
//             email,
//             password,
//             // emailVerified: false, // Email verification required
//             // displayName: name,
//         });

//         // // Send email verification link
//         // const verificationLink = await admin.auth().generateEmailVerificationLink(email);
//         // // Here, send the verificationLink via email using Nodemailer or any email service

//         // Save user to MongoDB
//         const newUser = new User({
//             uid: userRecord.uid,
//             email,
//             role: 'client',
//         });

//         const savedUser = await newUser.save();
//         console.log('User created successfully');

//         res.status(201).json({ message: 'User registered. Verify email before login.'});
//     } catch (error) {
//         console.error('Error registering user:', error.message);
//         res.status(500).json({ error: 'Internal server error' });
//     }
// }

// module.exports = { registerAccount };
