const User = require('./User');
const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  admin_uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  isSuperAdmin: { type: Boolean, required: true , default: false},
});

const Admin = mongoose.model('Admin', adminSchema) ; // Create discriminator

Admin.createCollection().then(function(collection){
    console.log('Admin collection created');
});

module.exports = Admin;
