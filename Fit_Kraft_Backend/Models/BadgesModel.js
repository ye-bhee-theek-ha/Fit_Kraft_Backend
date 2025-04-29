const mongoose=require('mongoose')

const BadgesSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true // Ensure badge names are unique
    },
    description: {
        type: String,
        required: true
    },
    iconUrl: { // URL to the badge image/icon
        type: String,
        required: true
    },
    criteriaType: { // Defines the type of check required
        type: String,
        required: true,
        enum: [ // Define all possible criteria types you'll support
            'WORKOUT_COUNT',        // e.g., Complete X workouts
            'PROFILE_COMPLETE',     // e.g., Fill all profile fields
            'BMI_REACHED',          // e.g., Reach a specific BMI
            'WEIGHT_LOGGED_COUNT',  // e.g., Log weight X times
            'FIRST_WORKOUT',        // e.g., Complete the first workout
            'LOGIN_STREAK',         // e.g., Log in X days consecutively (harder, might need separate tracking)
            // Add more as needed
        ]
    },
    criteriaValue: { // The value needed to meet the criteria (can be flexible)
        type: mongoose.Schema.Types.Mixed, // Use Mixed for flexibility (e.g., number for counts, string for specific goals)
        required: function() {
            // Make value required unless it's a simple boolean check like PROFILE_COMPLETE or FIRST_WORKOUT
            return !['PROFILE_COMPLETE', 'FIRST_WORKOUT'].includes(this.criteriaType);
        }
    },
    // Optional: A category for organizing badges
    category: {
        type: String,
        enum: ['Physical Fitness', 'Nutrition & Diet', 'Mental Wellness', 'Grouped (Login)',
            'Single Achievement','Daily Challenge','Weekly Challenge','Monthly Challenge','Streak'],
        default: 'Milestone'
    },
    // Optional: Points or rarity
    points: {
        type: Number,
        default: 0
    },
}, { timestamps: true });



const Badges=mongoose.model('Badges',BadgesSchema)

module.exports=Badges