const mongoose = require('mongoose');
const Client = require('./Client');
const Trainer = require('./Trainer');
const Appointment = require('./Appointment');

const exerciseEntrySchema = new mongoose.Schema({
    exercise: {
        type: String,
        required: true
    },
    sets: {
        type: Number,
        default: 0
    },
    reps: {
        type: Number,
        default: 0
    },
    load: {
        type: Number,
        default: 0,
        description: "Weight in kg"
    },
    time: {
        type: String,
        description: "Duration of exercise"
    },
    rpe: {
        type: Number,
        min: 0,
        max: 10,
        description: "Rate of Perceived Exertion"
    },
    trainingValue: {
        type: Number,
        default: 0
    }
});


const reportSchema = new mongoose.Schema({
    client: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Client',
        required: true,
    },
    trainer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Trainer',
        required: true
    },
    appointment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Appointment',
        required: true,
    },
    exercises: [exerciseEntrySchema],
    subtotalTrainingVolume: {
        type: Number,
        default: 0
    },
    rpeDailyRating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    sorenessDailyRating: {
        type: Number,
        min: 0,
        max: 10,
        default: 0
    },
    specialConsiderations: {
        type: String
    },
    foodNotes: {
        type: String
    },
    waterNotes: {
        type: String
    },
    sleepNotes: {
        type: String
    },
    reportStatus: {
        type: String,
        enum: ['draft', 'completed', 'reviewed'],
        default: 'draft'
    }
}, { timestamps: true });

reportSchema.methods.calculateSubtotalTrainingVolume = function () {
    let dailyVolume = 0;

    this.exercises.forEach(exercise => {
        // Calculate training value for each exercise if not already set
        if (!exercise.trainingValue) {
            // Common formula: sets × reps × load
            exercise.trainingValue = exercise.sets * exercise.reps * exercise.load;
        }

        dailyVolume += exercise.trainingValue;
    });
    this.subtotalTrainingVolume = dailyVolume;
    return dailyVolume;
}

reportSchema.pre('save', function (next) {
    this.calculateSubtotalTrainingVolume();
    next();
});

const Report = mongoose.model('Report', reportSchema);

module.exports = Report;