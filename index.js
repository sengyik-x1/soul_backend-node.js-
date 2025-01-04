const express = require('express');
const dotenv = require('dotenv');
const app = require('./app');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Appointment = require('./model/Appointment');
const ServiceType = require('./model/ServiceType');
const Admin = require('./model/Admin');
const Client = require('./model/Client');
const Trainer = require('./model/Trainer');
const MembershipPackage = require('./model/MembershipPackages');


// Load environment variables
dotenv.config();

//connect to database
connectDB();

// Create Appointment collection if it does not exist
Appointment.createCollection().then(function(collection){
  console.log('Appointment collection created');
}).catch(err => {
  console.log('Appointment collection already exists or there was an error:', err);
});

// Create ServiceType collection if it does not exist
ServiceType.createCollection().then(function(collection){
  console.log('ServiceType collection created');
}).catch(err => {
  console.log('ServiceType collection already exists or there was an error:', err);
});

// Create Admin collection if it does not exist
Admin.createCollection().then(function(collection){
  console.log('Admin collection created');
}).catch(err => {
  console.log('Admin collection already exists or there was an error:', err);
});

// Create Client collection if it does not exist
Client.createCollection().then(function(collection){
  console.log('Client collection created');
}).catch(err => {
  console.log('Client collection already exists or there was an error:', err);
});

// Create Trainer collection if it does not exist
Trainer.createCollection().then(function(collection){
  console.log('Trainer collection created');
}).catch(err => {
  console.log('Trainer collection already exists or there was an error:', err);
});

// Create MembershipPackage collection if it does not exist
MembershipPackage.createCollection().then(function(collection){
  console.log('MembershipPackage collection created');
}).catch(err => {
  console.log('MembershipPackage collection already exists or there was an error:', err);
});




const PORT = process.env.PORT || 3000;

// mongoose.connect(process.env.MONGODB_URI)
// .then(() => { console.log('Connected to MongoDB') })
// .catch((err) => { console.log(err) });

// Routes
// app.get('/', (req, res) => {
//   res.send("Hello world~~~");
// });

// app.get('/about', (req, res) => {
//   res.send("About page~~~~");
// });

// app.post('/api/register', authenticateToken, async (req, res) => {
//   // Save user logic here...
//   const { uid, email, role } = req.body;

//   try {
//     const newUser = new User({ uid, email, role });
//     await newUser.save();
//     res.status(201).send('User saved successfully');
//   } catch (error) {
//     res.status(400).send('Error saving user');
//   }
// });

// Start the server
app.listen(PORT, () => {
  console.log(`Server is listening on port http://localhost:${PORT}`);
});
