const mongoose = require('mongoose');
const Exercise = require('./ExerciseModel');

const WorkoutSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    exercises: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Exercise'
    }],
    duration: {
        minutes: {
            type: Number,
            default: 0
        },
        seconds: {
            type: Number,
            default: 0
        }
    },
    caloriesBurned: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    }
});

const Workout = mongoose.model('Workout', WorkoutSchema);

module.exports = Workout;