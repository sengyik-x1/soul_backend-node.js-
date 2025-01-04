const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, enum: ['client', 'trainer', 'admin'], default: 'client' },
  createdAt: { type: Date, default: Date.now },
},);

// // Post-save hook to handle role-based collections
// userSchema.post('save', async function (doc, next) {
//   try {
//     if (doc.role === 'client') {
//       // Check if the client record already exists
//       const existingClient = await Client.findOne({ userId: doc._id });
//       if (!existingClient) {
//         // Create a new client record
//         await Client.create({ userId: doc._id });
//         console.log('Client record created for user:', doc.email);
//       }
//     }
//     next();
//   } catch (error) {
//     console.error('Error in post-save hook:', error.message);
//     next(error);
//   }
// });

const User = mongoose.model('User', userSchema);

module.exports = User;
