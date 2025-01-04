const mongoose = require('mongoose');
const User = require('./User');

const timeslotSchema = new mongoose.Schema({
  startTime: { type: String },
  endTime: { type: String },
  isAvailable: { type: Boolean, required: true, default: true },
});

const trainerSchema = new mongoose.Schema({
  trainer_uid: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  name: { type: String  },
  position: { type: String },
  totalClassConducted: { type: Number, default: 0 },
  timeslots: [timeslotSchema],
});

// Pre-save hook to initialize timeslots
trainerSchema.pre('save', function (next) {
    if (this.timeslots.length === 0) {
      // Initialize timeslots from 8:00 AM to 8:00 PM for today
    //   const today = new Date().toISOString().split('T')[0];  Get today's date in "YYYY-MM-DD" format
      for (let hour = 8; hour < 20; hour++) {
        this.timeslots.push({
          //date: today,
          startTime: `${hour}:00`,
          endTime: `${hour + 1}:00`,
        });
      }
      console.log(`Timeslots initialized for trainer ${this.name}`);
    }
    next();
  });

//creating trainer collection if not exist
const Trainer = mongoose.model('Trainer', trainerSchema);
Trainer.createCollection().then(function(collection){
    console.log('Trainer collection created');
})

module.exports = Trainer;
