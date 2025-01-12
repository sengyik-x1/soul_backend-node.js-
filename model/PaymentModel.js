const PaymentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    trainerId: { type: mongoose.Schema.Types.ObjectId, required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
    paymentMethod: { type: String, default: 'fpx' },
    bankCode: { type: String }, // Store selected bank code
    paymentIntentId: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  });
  
  const Payment = mongoose.model('Payment', PaymentSchema);