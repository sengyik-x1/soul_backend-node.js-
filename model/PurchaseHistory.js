const mongoose = require('mongoose');

const purchaseHistorySchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  clientName: {
    type: String
  },
  clientEmail: {
    type: String
  },
  packageType: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPackage',
    required: true
  },
  packageName: {
    type: String
  },
  purchaseDate: { 
    type: Date, 
    default: Date.now 
  },
  points: Number,
  amount: Number,
  paymentId: String
}, { timestamps: true });

const PurchaseHistory = mongoose.model('PurchaseHistory', purchaseHistorySchema);

PurchaseHistory.createCollection().then(function(collection){
  console.log('PurchaseHistory collection created');
});

module.exports = PurchaseHistory;