const mongoose = require('mongoose');
const MembershipPackage = require('./MembershipPackages');
 

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
  }
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

clientSchema.methods.activateNewMembership = async function(packageId, paymentId) {
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
      // Create a new purchase history record in the separate collection
      const PurchaseHistory = mongoose.model('PurchaseHistory');
      await PurchaseHistory.create({
        client: this._id,
        clientName: this.name,
        clientEmail: this.email,
        packageType: this.membership.type,
        packageName: selectedPackage.name, // Assuming package has a name field
        purchaseDate: this.membership.startDate,
        points: this.membership.points,
        amount: selectedPackage.price,
        paymentId: paymentId || null
      });

    }

    // Set new membership
    this.membership = {
      type: selectedPackage._id,
      startDate,
      endDate,
      points: selectedPackage.points,
      isActive: true
    };

    try {
      const PurchaseHistory = mongoose.model('PurchaseHistory');
      const newPurchaseRecord = await PurchaseHistory.create({
        client: this._id,
        clientName: this.name,
        clientEmail: this.email,
        packageType: selectedPackage._id,
        packageName: selectedPackage.name,
        purchaseDate: startDate,
        points: selectedPackage.points,
        amount: selectedPackage.price,
        paymentId: paymentId || null
      });
      
      console.log('Created purchase history record for new membership:', newPurchaseRecord._id);
    } catch (newPurchaseHistoryError) {
      console.error('Failed to create purchase history record for new membership:', newPurchaseHistoryError);
      // Continue even if purchase history fails
    }

    return this.membership;
  } catch (error) {
    throw new Error(`Failed to activate membership: ${error.message}`);
  }
};

clientSchema.methods.getPurchaseHistory = async function() {
  try {
    const PurchaseHistory = mongoose.model('PurchaseHistory');
    return await PurchaseHistory.find({ client: this._id })
                               .populate('packageType')
                               .sort({ purchaseDate: -1 });
  } catch (error) {
    throw new Error(`Failed to retrieve purchase history: ${error.message}`);
  }
};

// Add a helper method to populate membership details
clientSchema.methods.getFullMembershipDetails = async function() {
  try {
    // Populate the membership type
    await this.populate('membership.type');
    
    // Get purchase history from the separate collection
    const purchaseHistory = await this.getPurchaseHistory();
    
    // Return combined data
    return {
      client: this,
      purchaseHistory: purchaseHistory
    };
  } catch (error) {
    throw new Error(`Failed to get full membership details: ${error.message}`);
  }
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