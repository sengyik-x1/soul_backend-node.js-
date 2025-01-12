// const http = require('http');
// const { Server } = require('socket.io');
// const dotenv = require('dotenv');
// const mongoose = require('mongoose');
// const connectDB = require('./config/db');
// const app = require('./app');

// // Load environment variables
// dotenv.config();

// // Connect to the database
// connectDB();

// // Initialize HTTP server
// const server = http.createServer(app);

// // Attach Socket.IO to the server
// const io = new Server(server, {
//   cors: {
//     origin: '*', // Allow all origins (adjust in production)
//     methods: ['GET', 'POST'],
//   },
// });

// // Attach `io` to `app` for use in routes or controllers
// app.set('io', io);

// // Handle WebSocket events
// io.on('connection', (socket) => {
//   console.log(`Client connected: ${socket.id}`);

//   // Example: Log message received from client
//   socket.on('message', (data) => {
//     console.log('Message from client:', data);
//   });

//   // Handle disconnection
//   socket.on('disconnect', () => {
//     console.log(`Client disconnected: ${socket.id}`);
//   });
// });

// // Start the server
// const PORT = process.env.PORT || 3000;
// server.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });
