const mongoose = require('mongoose');
const MembershipPackage = require('./MembershipPackages');

const purchaseHistorySchema = new mongoose.Schema({
  packageType: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPackage'
  },
  purchaseDate: { 
    type: Date, 
    default: Date.now 
  },
  points: Number,
  amount: Number,
  paymentId: String
}); 

const membershipSchema = new mongoose.Schema({
  type: { 
    type: mongoose.SchemaTypes.ObjectId, 
    ref: 'MembershipPackage',
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  points: { 
    type: Number, 
    required: true 
  },
  isActive: { 
    type: Boolean, 
    default: false
  },
  purchaseHistory: [purchaseHistorySchema]
});


const clientSchema = new mongoose.Schema({
  client_uid: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  gender: { 
    type: String 
  },
  age: { 
    type: Number 
  },
  height: { 
    type: Number 
  },
  weight: { 
    type: Number 
  },
  bmi: { 
    type: Number 
  },
  healthCondition: { 
    type: String, 
    //default: null 
  },
  goals: [{ 
    type: String 
  }],
  membership: membershipSchema,
}, { timestamps: true });

// Calculate BMI method
// clientSchema.methods.calculateBMI = function() {
//   return this.weight / Math.pow(this.height / 100, 2);
// };

// Pre-save middleware for BMI calculation
// clientSchema.pre('save', function(next) {
//   if (this.height && this.weight) {
//     this.bmi = this.calculateBMI();
//   }
//   next();
// });

// Helper methods for membership management
clientSchema.methods.isEligibleForNewMembership = function() {
  if (!this.membership || !this.membership.isActive) {
    return true;
  }
  
  const now = new Date();
  return now > this.membership.endDate || this.membership.points < 250;
};

clientSchema.methods.activateNewMembership = async function(packageId) {
  try {
    // Fetch the package details from MembershipPackage collection
    const selectedPackage = await MembershipPackage.findById(packageId);
    if (!selectedPackage) {
      throw new Error('Invalid package ID');
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + selectedPackage.durationMonths);

    // If there's an existing membership, store it in purchase history
    if (this.membership) {
      if (!this.membership.purchaseHistory) {
        this.membership.purchaseHistory = [];
      }
      
      // Add current membership to purchase history
      this.membership.purchaseHistory.push({
        packageType: selectedPackage._id, // This is already an ObjectId
        purchaseDate: this.membership.startDate,
        points: selectedPackage.points,
        amount: selectedPackage.price,
      });
    }

    // Set new membership
    this.membership = {
      type: selectedPackage._id, // Store the ObjectId reference
      startDate,
      endDate,
      points: selectedPackage.points,
      isActive: true,
      purchaseHistory: this.membership ? this.membership.purchaseHistory : []
    };

    return this.membership;
  } catch (error) {
    throw new Error(`Failed to activate membership: ${error.message}`);
  }
};

// Add a helper method to populate membership details
clientSchema.methods.getFullMembershipDetails = function() {
  return this.populate('membership.type')
             .populate('membership.purchaseHistory.packageType');
};

clientSchema.methods.deductPoints = function(points) {
  if (!this.membership || !this.membership.isActive) {
    console.log('No active membership');
    throw new Error('No active membership');
  }
  
  if (this.membership.points < points) {
    console.log('Insufficient points');
    throw new Error('Insufficient points');
  }
  
  this.membership.points -= points;
  return this.membership.points;
}; 

const Client = mongoose.model('Client', clientSchema);
Client.createCollection().then(function(collection){
  console.log('Client collection created');
});

module.exports = Client;