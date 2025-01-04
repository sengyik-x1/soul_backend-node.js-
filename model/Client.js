const MembershipPackage = require('./MembershipPackages');
const User = require('./User');
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
  client_uid: { type: String, required: true, unique: true }, // Unique identifier for the client
  name: { type: String }, // Name of the client 
  email: { type: String, required: true, unique: true },
  gender: { type: String,  }, // Gender of the client (e.g., Male, Female, Other)
  age: { type: Number,  }, // Age of the client
  height: { type: Number,  }, // Height in cm
  weight: { type: Number,  }, // Weight in kg
  bmi: { type: Number,  }, // Body Mass Index (calculated)
  healthCondition: { type: String, default: null }, // Optional health conditions
  goals: [{ type: String }], // Array of fitness goals
  membershipPackage: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPackage' , default: null }, // Active membership type (e.g., Gold, Silver)
  membershipPoints: { type: Number, default: 0 }, // Points accumulated from memberships
}, { timestamps: true });

//creating client collection if not exist
const Client = mongoose.model('Client', clientSchema);
Client.createCollection().then(function(collection){
    console.log('Client collection created');
});

clientSchema.methods.calculateBMI = function() {
  return this.weight / Math.pow(this.height / 100, 2);
};

clientSchema.pre('save', function(next) {
  this.bmi = this.calculateBMI();
  next();
});

module.exports = Client;
