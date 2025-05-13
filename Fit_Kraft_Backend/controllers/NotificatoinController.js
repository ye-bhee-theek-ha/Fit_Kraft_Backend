const express = require('express')
const asyncHandler = require('express-async-handler')
const Notification = require ('../Models/NotificationModel')
const mongoose = require('mongoose')


const CreateNotification = async (req, res) => {
    try {
        // Destructure the required fields from the request body.
        const { user, category, message } = req.body;
    
        // --- Basic Validation ---
        // Check if required fields are present
        if (!user || !category || !message) {
          return res.status(400).json({ message: 'Missing required fields: user, category, and message are required.' });
        }
    
        // Since 'user' is now a String in the schema, the ObjectId validation is removed.
        // You might want to add other string-specific validations for 'user' if needed (e.g., length, format).
        // For example, if the user string should not be empty:
        if (typeof user !== 'string' || user.trim() === '') {
            return res.status(400).json({ message: 'User ID must be a non-empty string.' });
        }
    
    
        // Optional: Validate if category is one of the allowed enum values
        const allowedCategories = Notification.schema.path('category').enumValues;
        if (!allowedCategories.includes(category)) {
          return res.status(400).json({ message: `Invalid category. Allowed categories are: ${allowedCategories.join(', ')}` });
        }
    
        // Create a new notification instance
        const newNotification = new Notification({
          user, // 'user' is now expected to be a string
          category,
          message,
        });
    
        // Save the new notification to the database
        const savedNotification = await newNotification.save();
    
        // Send a 201 Created response with the newly created notification
        res.status(201).json(savedNotification);
    
      } catch (error) {
        // Log the error for debugging
        console.error('Error creating notification:', error);
    
        // Handle Mongoose validation errors specifically if needed
        if (error.name === 'ValidationError') {
          return res.status(400).json({ message: 'Validation Error', errors: error.errors });
        }
    
        // Send a generic server error message
        res.status(500).json({ message: 'Server error. Could not create notification.' });
      }
    };


const GetNotification = asyncHandler(async(req,res)=>{

    try {
        // Extract userId from request parameters
        const userId = req.params.userId;
    
        // Validate if userId is a valid MongoDB ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: 'Invalid User ID format.' });
        }
    
        // Find all notifications for the given userId
        // Sort them by timestamp in descending order (newest first)
        const notifications = await Notification.find({ user: userId })
          .sort({ timestamp: -1 }) // or .sort({ createdAt: -1 }) if using timestamps:true
          .exec();
    
        // If no notifications are found for the user, you might want to return an empty array
        // or a specific message, depending on your API design preference.
        if (!notifications) { // .find() returns an empty array if no documents match, not null
            // This condition might not be strictly necessary as an empty array is a valid response
            return res.status(404).json({ message: 'No notifications found for this user.' });
        }
    
        // Send the notifications back in the response
        res.status(200).json(notifications);
    
      } catch (error) {
        // Log the error for debugging purposes
        console.error('Error fetching user notifications:', error);
    
        // Send a generic error message to the client
        res.status(500).json({ message: 'Server error. Could not retrieve notifications.' });
      }
    }



)



const DeleteNotificationById = async (req, res) => {
    try {
      // Extract notificationId from request parameters
      const notificationId = req.params.notificationId;
  
      // Validate if notificationId is a valid MongoDB ObjectId
      if (!mongoose.Types.ObjectId.isValid(notificationId)) {
        return res.status(400).json({ message: 'Invalid Notification ID format.' });
      }
  
      // Find the notification by ID and delete it
      // findByIdAndDelete returns the deleted document, or null if not found
      const deletedNotification = await Notification.findByIdAndDelete(notificationId);
  
      // If no notification was found with that ID
      if (!deletedNotification) {
        return res.status(404).json({ message: 'Notification not found.' });
      }
  
      // Send a success response
      // You could also send back the deletedNotification object if useful for the client
      res.status(200).json({ message: 'Notification deleted successfully.' });
  
    } catch (error) {
      // Log the error for debugging purposes
      console.error('Error deleting notification:', error);
  
      // Send a generic error message to the client
      res.status(500).json({ message: 'Server error. Could not delete notification.' });
    }
  };



module.exports={CreateNotification,GetNotification,DeleteNotificationById}




