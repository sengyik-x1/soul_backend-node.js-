const mongoose = require('mongoose');

const membershipPackageSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // Unique name of the membership package
  price: { type: Number, required: true }, // Cost of the membership package
  durationMonths: { type: Number, required: true }, // Duration of the package in months
  points: { type: Number, default: 0 }, // Points rewarded for purchasing this package
  description: [{ 
    services: { type: String},
    sessions: { type: String},
    bodyScan3D: { type: Number},
    basicModalities: { type: String}, 
  }], // Detailed description of the package
}, { timestamps: true });

//creating membershipPackage collection if not exist
const MembershipPackage = mongoose.model('MembershipPackage', membershipPackageSchema);
MembershipPackage.createCollection().then(function(collection){
    console.log('MembershipPackage collection created');
});

module.exports = MembershipPackage;
