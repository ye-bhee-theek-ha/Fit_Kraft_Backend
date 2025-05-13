const mongoose = require('mongoose')

const notificationCategories = [
    "system",
    "badges",
    "progress",
    "achievement",
    "workout",
    "diet",
    "reminder"
];


const NotificationSchema = new mongoose.Schema({

    user: {
        type: String,
        required: true,
        index: true // Indexing can still be beneficial on string user identifiers
      },

    category: {
        type: String,
        enum: notificationCategories,
        required: true,
        trim: true 
      },
      
      message: {
        type: String,
        required: true,
        trim: true
      },
     
      timestamp: {
        type: Date,
        required: true,
        default: Date.now
      },
     
      read: {
        type: Boolean,
        required: true,
        default: false
      },
      


})


const Notification = mongoose.model('Notification', NotificationSchema);
module.exports= Notification

