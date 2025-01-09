const mongoose = require('mongoose');
const MembershipPackage = require('./MembershipPackages');

const membershipSchema = new mongoose.Schema({
  type: { 
    type: mongoose.SchemaTypes.ObjectId, 
    ref: MembershipPackage,
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
  active: { 
    type: Boolean, 
    default: true 
  },
  purchaseHistory: [{
    packageType: { 
      type: String, 
      enum: ['SILVER', 'GOLD', 'DIAMOND'] 
    },
    purchaseDate: { 
      type: Date, 
      default: Date.now 
    },
    points: Number,
    amount: Number,
    paymentId: String
  }]
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
clientSchema.methods.calculateBMI = function() {
  return this.weight / Math.pow(this.height / 100, 2);
};

// Pre-save middleware for BMI calculation
clientSchema.pre('save', function(next) {
  if (this.height && this.weight) {
    this.bmi = this.calculateBMI();
  }
  next();
});

// Helper methods for membership management
clientSchema.methods.isEligibleForNewMembership = function() {
  if (!this.membership || !this.membership.active) {
    return true;
  }
  
  const now = new Date();
  return now > this.membership.endDate || this.membership.points < 250;
};

clientSchema.methods.activateNewMembership = function(packageType) {
  const packages = {
    SILVER: { duration: 6, points: 3300, amount: 330 },
    GOLD: { duration: 12, points: 5750, amount: 575 },
    DIAMOND: { duration: 12, points: 12800, amount: 1280 }
  };

  const selectedPackage = packages[packageType];
  if (!selectedPackage) {
    throw new Error('Invalid package type');
  }

  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + selectedPackage.duration);

  // If there's an existing membership, store it in purchase history
  if (this.membership) {
    if (!this.membership.purchaseHistory) {
      this.membership.purchaseHistory = [];
    }
    this.membership.purchaseHistory.push({
      packageType: this.membership.type,
      purchaseDate: this.membership.startDate,
      points: this.membership.points,
      amount: selectedPackage.amount
    });
  }

  // Set new membership
  this.membership = {
    type: packageType,
    startDate,
    endDate,
    points: selectedPackage.points,
    active: true,
    purchaseHistory: this.membership ? this.membership.purchaseHistory : []
  };
};

clientSchema.methods.deductPoints = function(points) {
  if (!this.membership || !this.membership.active) {
    throw new Error('No active membership');
  }
  
  if (this.membership.points < points) {
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