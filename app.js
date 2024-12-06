const express = require('express');
const userRoutes = require('./routes/userRoutes');
const middlewares = require('./middlewares/authMiddleware');

const app = express();
const { scheduleUserSyncJob } = require("./jobs/userSyncJob"); 
console.log("Starting scheduled jobs...");
// Initialize scheduled jobs
scheduleUserSyncJob();
// Middleware
app.use(express.json()); // Parse JSON requests

// Routes
app.use('/api/users', userRoutes); // User routes

module.exports = app;
