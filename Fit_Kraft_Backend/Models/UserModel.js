const mongoose = require("mongoose");
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    nickname: { type: String, required: true },
    email: { type: String, required: true },
    password: { type: String, required: true },
    height: { type: Number, },
    weight: { type: Number, },
    age: { type: Number,  },
    gender: { type: String, },
    goal: { type: String,  },
    activityLevel: { type: String,  },
    bmi: { type: Number,  },
    bmr: { type: Number,  },
    workouts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workout' }],
    badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }]
});

// Middleware to hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};



module.exports = mongoose.model("User", userSchema);