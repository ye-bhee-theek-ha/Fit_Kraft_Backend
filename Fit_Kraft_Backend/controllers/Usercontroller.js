const express =require('express')
const asyncHandler=require('express-async-handler')
const User=require('../Models/UserModel')
const Badges=require('../Models/BadgesModel')
const calculateMetrics = require('../middleware/calculateMetrics');
const mongoose = require('mongoose');
const MentalScore =require('../Models/MentallScoreModel')
const FLASK_API_URL = 'http://127.0.0.1:5000/api/predict/mental_score';
const axios = require('axios');

const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};


const getUser = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).select("-password"); // Exclude password

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
});

const CreateUser = asyncHandler(async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ message: "Request body is missing" });
        }

        const { name, nickname, email, password } = req.body;

        // Validate required fields for user creation
        if (!name || !nickname || !email || !password) {
            return res.status(400).json({
                message: "Name, nickname, email, and password are required.",
            });
        }

        // Check if email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Create user with only required fields
        const newUser = new User({
            name,
            nickname,
            email,
            password,
            height: req.body.height || null,
            weight: req.body.weight || null,
            age: req.body.age || null,
            gender: req.body.gender || null,
            goal: req.body.goal || null,
            activityLevel: req.body.activityLevel || null,
            bmi: req.body.bmi || null, // These will be set by middleware later
            bmr: req.body.bmr || null,
            workouts: [],
            badges: [],
        });

        await newUser.save();

        res.status(201).json({
            message: "User created successfully",
            user: {
                _id: newUser._id,
                name: newUser.name,
                email: newUser.email,
                token: generateToken(newUser._id),
                onboardingComplete: false, // They haven't completed onboarding yet
            },
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message,
        });
    }
});

const getUserBadges = async (req, res) => {
    try {
      const userId = req.params.userId;
  
      // Find the user by their ID and populate the 'badges' field
      const user = await User.findById(userId).populate('badges');
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Send the user's badges as the response
      res.status(200).json({ badges: user.badges });
  
    } catch (error) {
      console.error('Error fetching user badges:', error);
      res.status(500).json({ message: 'Failed to fetch user badges' });
    }
  };

const Onboarding = asyncHandler(async (req, res) => {
    try {
        if (!req.body) {
            return res.status(400).json({ message: "Request body is missing" });
        }
        
        const userId = req.user.id;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
    
        console.log(req.body)
        
        const { height, weight, age, gender, goal, activityLevel } = req.body;
        
        if (
            height === undefined || weight === undefined || 
            age === undefined || gender === undefined || 
            goal === undefined || activityLevel === undefined
        ) {
            return res.status(400).json({
                message: "All fields (height, weight, age, gender, goal, activity level) are required.",
            });
        }

        // Use the calculateMetrics middleware for BMI and BMR calculation
        // We need to manually call it since it's not applied to this route in the router
        calculateMetrics(req, res, () => {
            // This function will execute after the middleware completes
            const { bmi, bmr } = req.body;
            
            // Continue with user update
            User.findByIdAndUpdate(
                userId,
                {
                    height,
                    weight,
                    age,
                    gender,
                    goal,
                    activityLevel,
                    bmi,
                    bmr,
                    onboardingComplete: true
                },
                { new: true }
            ).then(updatedUser => {
                if (!updatedUser) {
                    return res.status(404).json({ message: "User not found" });
                }
                
                res.status(200).json({
                    message: "Onboarding completed successfully",
                    user: {
                        _id: updatedUser._id,
                        name: updatedUser.name,
                        email: updatedUser.email,
                        onboardingComplete: true,
                        bmi,
                        bmr
                    },
                });
            }).catch(error => {
                throw error;
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Internal server error",
            error: err.message,
        });
    }
});


// Login a user
const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const isPasswordValid = await user.matchPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            token: generateToken(user._id),
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
};



const DeleteUser = asyncHandler(async (req, res) => {
    const user = await User.findByIdAndDelete(req.user.id);
    
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully", user });
});


const UpdateUser = asyncHandler(async (req, res) => {
    // Get userId from request parameters
    const { userId } = req.params;

    // Define the fields that are allowed to be updated
    const allowedFields = [
        'name', 'nickname', 'email',
        'height', 'weight', 'age', 'gender', 'goal',
        'activityLevel' // Added activityLevel
    ];

    // Create an object to hold only the allowed update data
    const updateData = {};

    // Populate updateData with allowed fields present in req.body
    allowedFields.forEach(field => {
        // Check if the field exists in the request body
        if (req.body.hasOwnProperty(field)) {
            // Add allowed fields directly to the update object
            updateData[field] = req.body[field];
        }
    });

    // Check if there's anything valid to update
    if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields provided for update" });
    }

    try {
        // Find the user by ID and update only the fields present in updateData
        // Using { $set: updateData } explicitly tells MongoDB to only update these fields
        const user = await User.findByIdAndUpdate(
            userId, // Get user ID from req.params
            { $set: updateData },
            {
                new: true, // Return the updated document
                runValidators: true, // Ensure schema validators run on update
                context: 'query' // Important for some validators during update operations
            }
        );

        if (!user) {
            // Use 404 if the user ID was valid format but not found
            return res.status(404).json({ message: "User not found" });
        }

        // Exclude password from the returned user object for security
        // (Even though we don't update it here, we still don't want to send the existing hash)
        const userResponse = user.toObject();
        
        res.status(200).json({ message: "User updated successfully", user: userResponse });

    } catch (error) {
        // Handle potential errors, e.g., validation errors
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: "Validation failed", errors: error.errors });
        }
        // Handle CastError if userId format is invalid
        if (error.name === 'CastError' && error.path === '_id') {
            return res.status(400).json({ message: "Invalid user ID format" });
        }
        // Log other unexpected errors for debugging
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Server error during user update" });
    }
});


const checkOnboardingStatus = asyncHandler(async (req, res) => {
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if all required fields are set
        const isOnboardingComplete =
            user.height && user.weight && user.age &&
            user.gender && user.goal && user.activityLevel;

        res.status(200).json({
            onboardingComplete: !!isOnboardingComplete,
            _id: user._id,
            name: user.name,
            email: user.email,
        });

    } catch (error) {
        console.error("Error checking onboarding status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

const createBadge = async (req, res) => {
    try {
      const { name, description, iconUrl, criteriaType, criteriaValue, category, points } = req.body;
  
      // Create a new badge instance
      const newBadge = new Badges({
        name,
        description,
        iconUrl,
        criteriaType,
        criteriaValue,
        category,
        points,
      });
  
      // Save the new badge to the database
      const savedBadge = await newBadge.save();
  
      // Send a successful response with the created badge
      res.status(201).json(savedBadge); // 201 Created status code
  
    } catch (error) {
      console.error('Error creating badge:', error);
      if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
        return res.status(400).json({ message: 'Badge name already exists.' });
      }
      res.status(500).json({ message: 'Failed to create badge' });
    }
  };

  const assignBadgeToUser = async (req, res) => {
    try {
      const userid = req.params.userid;
      const badgeid = req.params.badgeid;
  
      
  
      // Find the user by their ID
      const user = await User.findById(userid);
  
      if (!user) {
        return res.status(404).json({ message: `User with ID ${userId} not found` }); // 404 Not Found
      }
  
      // Check if the badge ID is not already in the user's badges array
      if (!user.badges.includes(badgeid)) {
        // Add the badge ID to the user's badges array
        user.badges.push(badgeid);
  
        // Save the updated user document
        await user.save();
        return res.status(200).json({ message: 'Badge assigned successfully', badgeid: badgeid, userid: userid }); // 200 OK
      } else {
        return res.status(200).json({ message: 'Badge already exists for this user', badgeid: badgeid, userid: userid }); // 200 OK - but indicate already present
      }
  
    } catch (error) {
      console.error('Error assigning badge to user:', error);
      return res.status(500).json({ message: 'Failed to assign badge', error: error.message }); // 500 Internal Server Error
    }
  };

  const createMentalScore = async (req, res) => {
    try {
      // Extract userId from request parameters
      const { userId } = req.params;
  
      // --- Basic Validation ---
      // Check if userId is provided
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return res.status(400).json({ message: 'User ID is required in the path and must be a non-empty string.' });
      }
  
      // Optional: Check if a score record already exists for this user
      // to prevent duplicates if that's the desired behavior.
      const existingRecord = await MentalScore.findOne({ User: userId.trim() });
      if (existingRecord) {
        return res.status(409).json({ message: `A mental score record already exists for User: ${userId}` });
      }
  
      // Create a new MentalScore instance
      // User is set from params, Score and Previous_Score are initialized to 0.
      const newMentalScore = new MentalScore({
        User: userId.trim(),
        Score: 0,
        Previous_Score: 0
      });
  
      // Save the new mental score to the database
      const savedMentalScore = await newMentalScore.save();
  
      // Send a 201 Created response with the newly created document
      res.status(201).json(savedMentalScore);
  
    } catch (error) {
      // Log the error for debugging purposes
      console.error('Error creating mental score:', error);
  
      // Handle Mongoose validation errors (if any are added to the schema later)
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: error.errors });
      }
  
      // Send a generic server error message
      res.status(500).json({ message: 'Server error. Could not create mental score.' });
    }
  };

  const updateUserMentalScore = async (req, res) => {
    try {
      const { userIdentifier } = req.params; // The 'User' string ID from the route
  
      // Extract new data points from the request body
      // These are the names your Node.js API receives
      const { Age, Mood_Score, Physical_Activity, Stress_Level } = req.body;
  
      // --- Validation for parameters ---
      if (!userIdentifier || typeof userIdentifier !== 'string' || userIdentifier.trim() === '') {
        return res.status(400).json({ message: 'User identifier is required in the path and must be a non-empty string.' });
      }
  
      // Validate required body fields
      const requiredFields = { Age, Mood_Score, Physical_Activity, Stress_Level };
      for (const [field, value] of Object.entries(requiredFields)) {
        if (value === undefined) {
          return res.status(400).json({ message: `${field} is required in the request body.` });
        }
        if (typeof value !== 'number') { // Assuming Flask API expects numbers (floats)
          return res.status(400).json({ message: `${field} must be a number.` });
        }
      }
  
      // 1. Find the existing MentalScore document for the User
      const existingScoreDoc = await MentalScore.findOne({ User: userIdentifier.trim() });
  
      if (!existingScoreDoc) {
        return res.status(404).json({ message: `Mental score record not found for User: ${userIdentifier}` });
      }
  
      // 2. Make a POST request to the Flask server to get the new score
      let newScoreFromFlask;
      try {
        // *** Keys reverted to use underscores to match Flask's data['key'] access ***
        const flaskApiPayload = {
          'Age': Age,
          'Mood_Score': Mood_Score,
          'Physical_Activity': Physical_Activity,
          'Stress_Level': Stress_Level
          // If your Flask API also needs the User identifier, add it here:
          // 'User': userIdentifier.trim(),
        };
        console.log(`Requesting new score from Flask API for User: ${userIdentifier} with payload:`, flaskApiPayload);
  
        const flaskResponse = await axios.post(FLASK_API_URL, flaskApiPayload);
  
        // Adjust to read from "AI-Detected_Emotional_State"
        // And convert the string value to a number
        if (flaskResponse.data && flaskResponse.data["AI-Detected_Emotional_State"] !== undefined) {
          const predictedValue = parseFloat(flaskResponse.data["AI-Detected_Emotional_State"]);
          if (!isNaN(predictedValue)) {
              newScoreFromFlask = predictedValue;
              console.log(`Received new score from Flask: ${newScoreFromFlask}`);
          } else {
              console.error('Flask API returned a non-numeric score:', flaskResponse.data["AI-Detected_Emotional_State"]);
              return res.status(500).json({ message: 'Received non-numeric score from prediction service.' });
          }
        } else {
          console.error('Invalid response structure from Flask API (expected "AI-Detected_Emotional_State"):', flaskResponse.data);
          return res.status(500).json({ message: 'Received invalid score format from prediction service.' });
        }
      } catch (apiError) {
        console.error('Error calling Flask API:', apiError.message);
        if (apiError.response) {
          console.error('Flask API Response Status:', apiError.response.status);
          console.error('Flask API Response Data:', apiError.response.data);
          return res.status(502).json({
            message: 'Failed to fetch new score from prediction service.',
            error: apiError.response.data || apiError.message
          });
        }
        return res.status(502).json({ message: 'Failed to fetch new score from prediction service.', error: apiError.message });
      }
  
      // 3. Update the MentalScore document
      existingScoreDoc.Previous_Score = existingScoreDoc.Score; // Current score becomes previous
      existingScoreDoc.Score = newScoreFromFlask;             // New score from Flask
  
      // 4. Save the updated document
      const updatedScoreDoc = await existingScoreDoc.save();
  
      res.status(200).json(updatedScoreDoc);
  
    } catch (error) {
      console.error('Error updating mental score:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: error.errors });
      }
      res.status(500).json({ message: 'Server error. Could not update mental score.' });
    }
  };


module.exports = {getUser, CreateUser, DeleteUser,getUserBadges, UpdateUser, loginUser, checkOnboardingStatus, Onboarding,createBadge,assignBadgeToUser,createMentalScore,updateUserMentalScore};


