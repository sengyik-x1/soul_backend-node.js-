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
const admin = require('firebase-admin');

// Load environment variables
dotenv.config();

// Connect to the database
//connectDB();
connectDB().then(() => { // Connect to DB and then execute schedule script
  console.log("MongoDB connected for schedule initialization...");

  // Fetch all existing trainer documents and initialize schedule
  mongoose.connection.db.collection('trainers').find({}).forEach(function(trainer) { // Use mongoose.connection.db.collection('trainers')
    if (!trainer.schedule || trainer.schedule.length === 0) { // Check if schedule is missing or empty
      let schedule = [];

      // Weekdays (Monday to Friday)
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].forEach(day => {
        const timeslots = [];
        for (let hour = 8; hour < 20; hour++) {
          timeslots.push({
            startTime: `${hour}:00`,
            endTime: `${hour + 1}:00`,
            isAvailable: true
          });
        }
        schedule.push({ dayOfWeek: day, timeslots });
      });

      // Saturday (8:00 to 17:00)
      const saturdayTimeslots = [];
      for (let hour = 8; hour < 17; hour++) {
        saturdayTimeslots.push({
          startTime: `${hour}:00`,
          endTime: `${hour + 1}:00`,
          isAvailable: true
        });
      }
      schedule.push({ dayOfWeek: 'saturday', timeslots: saturdayTimeslots });

      // Sunday (8:00 to 13:00)
      const sundayTimeslots = [];
      for (let hour = 8; hour < 13; hour++) {
        sundayTimeslots.push({
          startTime: `${hour}:00`,
          endTime: `${hour + 1}:00`,
          isAvailable: true
        });
      }
      schedule.push({ dayOfWeek: 'sunday', timeslots: sundayTimeslots });

      // Update the trainer document with the new schedule
      mongoose.connection.db.collection('trainers').updateOne( // Use mongoose.connection.db.collection('trainers')
        { _id: trainer._id }, // Target specific trainer using _id
        { $set: { schedule: schedule } }
      );
      console.log(`Schedule initialized for trainer with trainer_uid: ${trainer.trainer_uid}`);
    } else {
      console.log(`Schedule already exists for trainer with trainer_uid: ${trainer.trainer_uid}`);
    }
  }, () => { // Callback after forEach is complete (important for async operations)
    console.log("Schedule initialization process completed for all trainers checked.");
  });
});
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
//io use middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Unauthorized: No token provided'));
    }
    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.user = decodedToken;
    socket.userId = decodedToken.uid;
    console.log('Authenticated socket:', socket.userId);
    next();
  } catch (error) {
    console.error('Socket authentication failed:', error.message);
    return next(new Error('Unauthorized: Invalid or expired token'));
  }
})

// Handle WebSocket events

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);
  
  // Store user ID for tracking
  const userId = socket.userId;
  console.log(`User ${userId} connected with socket ${socket.id}`);
  
  // Setup heartbeat mechanism
  socket.on('ping', (data, callback) => {
    console.log(`Received ping from ${socket.id}`);
    // If callback exists, call it (acknowledges the ping)
    if (typeof callback === 'function') {
      callback('pong');
    }
  });
  
  // Handle token refresh
  socket.on('token_refresh', async (data, callback) => {
    try {
      const { token } = data;
      if (!token) {
        throw new Error('No token provided for refresh');
      }
      
      // Verify the new token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Update socket user data
      socket.user = decodedToken;
      socket.userId = decodedToken.uid;
      
      console.log(`Token refreshed for user ${socket.userId}`);
      
      // Send success response
      if (typeof callback === 'function') {
        callback({ success: true });
      }
    } catch (error) {
      console.error('Token refresh failed:', error.message);
      if (typeof callback === 'function') {
        callback({ 
          success: false, 
          error: error.message 
        });
      }
    }
  });

  // Handle disconnection
  socket.on('disconnect', (reason) => {
    console.log(`Client ${socket.id} disconnected. Reason: ${reason}`);
  });
});
// io.on('connection', (socket) => {
//   console.log(`Client connected: ${socket.id}`);

//   // Example: Handle messages from the client
//   socket.on('message', (data) => {
//     console.log('Message from client:', data);
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     console.log(`Client disconnected: ${socket.id}`);
//   });
// });


// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
