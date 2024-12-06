const express = require('express');
const dotenv = require('dotenv');
const app = require('./app');
const mongoose = require('mongoose');
const connectDB = require('./config/db');


// Load environment variables
dotenv.config();

connectDB();


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
