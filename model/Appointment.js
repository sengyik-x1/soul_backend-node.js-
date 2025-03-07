const mongoose = require('mongoose');
const ServiceType = require('./ServiceType');

const appointmentSchema = new mongoose.Schema({
    clientId: { type: mongoose.SchemaTypes.ObjectId, ref:'Client' , required: true }, 
    trainerId: { type: mongoose.SchemaTypes.ObjectId, ref: 'Trainer', required: true },
    appointmentDate: { type: Date, required: true },
    appointmentTime: {
      start: { type: String, required: true },
      end: { type: String, required: true }
  },
  serviceType: { type: String, required: true }, 
    status: { 
      type: String, 
      enum: ['rejected', 'pending', 'confirmed', 'cancelled', 'complete','reported'], 
      default: 'pending' 
    },
    // isConfirmed: {
    //     type: Boolean, 
    //     default: false

    // },
    // isRejected: {
    //     type: Boolean, 
    //     default: false
    // },
    // qrCode: { 
    //   code: { type: String }, // The QR code as a string (e.g., URL or base64-encoded image)
    //   isScanned: { type: Boolean, default: false } // Indicates if the QR code has been scanned
    // }
  }, { timestamps: true });

const Appointment = mongoose.model('Appointment', appointmentSchema);
//creating appointment collection if not exist
Appointment.createCollection().then(function(collection){
    console.log('Appointment collection created');
})
module.exports = Appointment;
