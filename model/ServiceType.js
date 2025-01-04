const mongoose = require('mongoose');

const serviceTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
});

const ServiceType = mongoose.model('ServiceType', serviceTypeSchema);
//creating serviceType collection if not exist
ServiceType.createCollection().then(function(collection){
    console.log('ServiceType collection created');
})
module.exports = mongoose.model('ServiceType', serviceTypeSchema);
