const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }, // Reference to Client
    trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trainer', required: true }, // Reference to Trainer/User
    appointmentDate: { type: Date, required: true },
    state: { 
      type: String, 
      enum: ['pending', 'in progress', 'complete'], 
      default: 'pending' 
    },
    isConfirmed: {
        type: Boolean, 
        default: false

    },
    qrCode: { 
      code: { type: String, required: true }, // The QR code as a string (e.g., URL or base64-encoded image)
      isScanned: { type: Boolean, default: false } // Indicates if the QR code has been scanned
    }
  }, { timestamps: true });
  
const Appointment = mongoose.model('Appointment', appointmentSchema);
//creating appointment collection if not exist
Appointment.createCollection().then(function(collection){
    console.log('Appointment collection created');
})
module.exports = Appointment;
