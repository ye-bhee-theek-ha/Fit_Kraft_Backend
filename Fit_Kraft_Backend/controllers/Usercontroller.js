const express =require('express')
const asyncHandler=require('express-async-handler')
const User=require('../Models/UserModel')
const calculateMetrics = require('../middleware/calculateMetrics');



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
    const user = await User.findByIdAndUpdate(req.user.id, req.body, { new: true, runValidators: true });

    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User updated successfully", user });
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
            onboardingComplete: !!isOnboardingComplete, // Convert to boolean
        });

    } catch (error) {
        console.error("Error checking onboarding status:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});






module.exports = {getUser, CreateUser, DeleteUser, UpdateUser, loginUser, checkOnboardingStatus, Onboarding};


