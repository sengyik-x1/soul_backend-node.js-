const express = require('express');
const userRoutes = require('./routes/userRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const membershipPackageRoutes = require('./routes/membershipPackageRoutes');
const clientRoutes = require('./routes/clientRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const reportRoutes = require('./routes/reportRoutes');
const {scheduleMembershipCheck} = require('./jobs/membershipExpiryChecker');
// const registerRoutes = require('./routes/registerRoute');
// const middlewares = require('./middlewares/authMiddleware');
const cors = require('cors');

const app = express();
// const { scheduleUserSyncJob } = require("./jobs/userSyncJob"); 
// console.log("Starting scheduled jobs...");
// // Initialize scheduled jobs
// scheduleUserSyncJob();
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
// Middleware
app.use(express.json()); // Parse JSON requests
app.use(cors({ origin: '*'})); // Enable CORS

// Routes
app.use('/api/users', userRoutes); // User routes
app.use('/api/appointments', appointmentRoutes); // Booking routes
app.use('/api/services', serviceRoutes); // Service routes
app.use('/api/trainers', trainerRoutes); // Timeslot routes
app.use('/api/membership-packages', membershipPackageRoutes); // Membership package routes
app.use('/api/clients', clientRoutes); // Client routes
app.use('/api/payments', paymentRoutes); // Payment routes
// app.use('/api/auth', registerRoutes); // Register routes
app.use('/api/reports', reportRoutes); // Report routes
scheduleMembershipCheck();

module.exports = app;
