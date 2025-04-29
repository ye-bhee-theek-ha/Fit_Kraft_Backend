const mongoose = require('mongoose');
const { Schema } = mongoose;

// Define the allowed values for the 'type' field using the provided enum
const wellnessTypes = ['YOGA', 'MUSIC', 'BODY_SCANNING', 'SLEEP', 'RELAXING_VIDEOS'];

const mentalWellnessSchema = new Schema(
    {
        title: {
            type: String,
            // required: false, // This is the default, explicitly stating it is optional
            trim: true,
        },
        description: {
            type: String,
            // required: false, // Already optional
            trim: true,
        },
        // Field using the defined enum types - now optional
        type: {
            type: String,
            // required: false, // Made optional
            enum: {
                values: wellnessTypes,
                message: '{VALUE} is not a supported wellness type.' // Validation still applies if a value IS provided
            },
        },
        category: {
            type: String,
            // required: false, // Made optional
            trim: true,
        },
        // Optional field to store the URL of an image
        imageUrl: {
            type: String,
            // required: false, // Already optional
            trim: true,
        },
        // Optional field for an audio file URL
        audioUrl: {
            type: String,
            // required: false, // Already optional
            trim: true,
        },
        // Video URL field - now optional
        videoUrl: {
            type: String,
            // required: false, // Made optional
            trim: true,
        },
        // Mongoose automatically adds an '_id' field.
    },
    {
        // Automatically add 'createdAt' and 'updatedAt' timestamp fields
        timestamps: true,
    }
);

// Create the Mongoose model from the schema
const MentalWellness = mongoose.model('MentalWellness', mentalWellnessSchema);

// Export the model
module.exports = MentalWellness;