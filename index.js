const http = require('http'); // Required for HTTP server
const { Server } = require('socket.io'); // Socket.IO
const express = require('express');
const dotenv = require('dotenv');
const app = require('./app'); // Import Express app
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

// Connect to the database
connectDB();

// Create collections if they do not exist
const createCollections = async () => {
  try {
    await Promise.all([
      Appointment.createCollection(),
      ServiceType.createCollection(),
      Admin.createCollection(),
      Client.createCollection(),
      Trainer.createCollection(),
      MembershipPackage.createCollection(),
    ]);
    console.log('All collections created');
  } catch (err) {
    console.error('Error creating collections:', err);
  }
};
createCollections();

// Initialize HTTP server and attach Express app
const server = http.createServer(app);

// Attach Socket.IO to the server
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (adjust in production)
    methods: ['GET', 'POST'],
  },
});

// Attach `io` to the Express app for use in routes or controllers
app.set('io', io);

// Handle WebSocket events
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Example: Handle messages from the client
  socket.on('message', (data) => {
    console.log('Message from client:', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
