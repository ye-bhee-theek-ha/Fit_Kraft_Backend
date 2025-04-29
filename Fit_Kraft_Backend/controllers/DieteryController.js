const express = require('express')
const asyncHandler = require('express-async-handler')
const Meal = require('../Models/MealModel')
const Dietary = require('../Models/DieteryModel')

const createMeal = asyncHandler(async(req,res)=>{
    const {name,calories,protein,carbs,fats,ingredients,instructions,image,category} = req.body
    const meal = await Meal.create({name,calories,protein,carbs,fats,ingredients,instructions,image,category})
    res.status(201).json(meal)
})

const createDietery = asyncHandler(async(req,res)=>{
    console.log('1. Function called');
    
    // Log raw request
    console.log('2. Raw request:', {
        body: req.body,
        headers: req.headers,
        method: req.method,
        url: req.url
    });

    try {
        // Check if body exists
        if (!req.body) {
            console.log('3. No request body found');
            return res.status(400).json({
                message: "No request body received",
                received: req
            });
        }

        // Log the raw body before any processing
        console.log('4. Request body:', req.body);

        // Check if body is empty object
        if (Object.keys(req.body).length === 0) {
            console.log('5. Empty request body');
            return res.status(400).json({
                message: "Request body is empty",
                received: req.body
            });
        }

        // Try to access Meals directly
        console.log('6. Attempting to access Meals:', req.body.Meals);

        const {
            UserId,
            Date,
            Meals,
            TotalCalories,
            TotalProtein,
            TotalCarbs,
            TotalFats,
            Day
        } = req.body;

        console.log('7. Destructured values:', {
            hasUserId: !!UserId,
            hasDate: !!Date,
            hasMeals: !!Meals,
            mealsType: typeof Meals,
            isArray: Array.isArray(Meals)
        });

        if (!UserId) {
            console.log('8. Missing UserId');
            return res.status(400).json({
                message: "UserId is required",
                received: req.body
            });
        }

        if (!Meals) {
            console.log('9. Missing Meals');
            return res.status(400).json({
                message: "Meals field is required",
                received: req.body
            });
        }

        if (!Array.isArray(Meals)) {
            console.log('10. Meals is not an array:', typeof Meals);
            return res.status(400).json({
                message: "Meals must be an array",
                received: {
                    type: typeof Meals,
                    value: Meals
                }
            });
        }

        console.log('11. Validation passed, processing meals');

        const processedMeals = []
        for(const meal of Meals) {
            let existingMeal = await Meal.findOne({
                Name: meal.Name,
                UserCreated_ID: UserId
            })

            if(!existingMeal) {
                existingMeal = await Meal.findOne({
                    Name: meal.Name,
                    UserCreated_ID: { $exists: false }
                })
            }

            if(!existingMeal) {
                existingMeal = await Meal.create({
                    Name: meal.Name,
                    Calories: meal.Calories,
                    Protein: meal.Protein,
                    Carbs: meal.Carbs,
                    Fats: meal.Fats,
                    Ingredients: meal.Ingredients,
                    Instructions: meal.Instructions,
                    Image: meal.Image,
                    Category: meal.Category,
                    UserCreated_ID: UserId
                })
            }
            
            processedMeals.push(existingMeal._id)
        }

        const dietery = await Dietery.create({
            UserId,
            Date: Date || new Date(),
            Meals: processedMeals,
            TotalCalories,
            TotalProtein,
            TotalCarbs,
            TotalFats,
            Day: Day || new Date().toLocaleDateString('en-US', { weekday: 'long' })
        });

        const populatedDietary = await dietery.populate('Meals');

        res.status(201).json({
            message: "Dietary plan created successfully",
            dietary: populatedDietary
        });
    } catch (error) {
        console.error('Error in createDietery:', error);
        res.status(500).json({
            message: "Error creating dietary plan",
            error: error.message
        });
    }
})

// modify get gietay to return the dietary plan for a specific day, last 7 days, specific date if provided amd all history {DONE}
const getDietary = asyncHandler(async(req, res) => {
    try {
        const userId = req.params.id;
        const { date, period } = req.query;
        
        let query = { UserId: userId };
        let startDate, endDate;
        
        if (period === 'today') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            query.Date = { $gte: today, $lt: tomorrow };
        } 
        else if (period === 'week' || period === 'last7days') {
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            const sevenDaysAgo = new Date(today);
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            
            query.Date = { $gte: sevenDaysAgo, $lte: today };
        }
        else if (period === 'all') {

        }
        else if (date) {

            const targetDate = new Date(date);
            targetDate.setHours(0, 0, 0, 0);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            query.Date = { $gte: targetDate, $lt: nextDay };
        }
        
        const dietary = await Dietary.find(query)
            .populate({
                path: 'Meals',
                // select: 'Name CaloriesPerServing ProteinPerServing CarbsPerServing FatsPerServing ServingSize Servings'
            })
            .sort({ Date: -1 })
            .lean();
        
        if (!dietary || dietary.length === 0) {
            return res.status(200).json({ 
                message: "No dietary records found for the specified criteria",
                data: [] 
            });
        }
        
        let summary = null;
        if (dietary.length > 1) {
            summary = {
                totalDays: dietary.length,
                averageCalories: dietary.reduce((sum, day) => sum + day.TotalCalories, 0) / dietary.length,
                averageProtein: dietary.reduce((sum, day) => sum + day.TotalProtein, 0) / dietary.length,
                averageCarbs: dietary.reduce((sum, day) => sum + day.TotalCarbs, 0) / dietary.length,
                averageFats: dietary.reduce((sum, day) => sum + day.TotalFats, 0) / dietary.length
            };
        }
        
        res.status(200).json({
            message: "Dietary records retrieved successfully",
            period: period || (date ? "specific-date" : "all"),
            count: dietary.length,
            summary,
            data: dietary
        });
        
    } catch (error) {
        console.error("Error fetching dietary data:", error);
        res.status(500).json({ 
            message: "Failed to retrieve dietary records", 
            error: error.message 
        });
    }
});


const updateDieteryMeals = asyncHandler(async(req,res)=>{
    const { meals, userId } = req.body
    
    // Process each meal
    const processedMeals = []
    for(const meal of meals) {
        // Check if meal exists by name and user
        let existingMeal = await Meal.findOne({
            Name: meal.name,
            UserCreated_ID: userId
        })

        // If not found with userId, check if it exists with just the name
        if(!existingMeal) {
            existingMeal = await Meal.findOne({
                Name: meal.name,
                UserCreated_ID: { $exists: false }
            })
        }

        if(!existingMeal) {
            // Create new meal if it doesn't exist
            existingMeal = await Meal.create({
                Name: meal.name,
                Calories: meal.calories,
                Protein: meal.protein,
                Carbs: meal.carbs,
                Fats: meal.fats,
                Ingredients: meal.ingredients,
                Instructions: meal.instructions,
                Image: meal.image,
                Category: meal.category,
                UserCreated_ID: userId
            })
        }
        
        processedMeals.push(existingMeal._id)
    }

    // Update dietary plan with processed meals
    const dietery = await Dietery.findByIdAndUpdate(
        req.params.id,
        { $set: { meals: processedMeals } },
        { new: true }
    )
    res.status(200).json(dietery)
})

const getMeals = asyncHandler(async(req,res)=>{
    const { name } = req.query;
    const userId = req.params.id;

    const systemMeals = await Meal.find({
        Name: { $regex: name, $options: 'i' },
        UserCreated_ID: { $exists: false }
    });

    // Find meals that match both name and userId (user created meals)
    const userMeals = await Meal.find({
        Name: { $regex: name, $options: 'i' },
        UserCreated_ID: userId
    });

    // Combine both results
    const allMeals = [...systemMeals, ...userMeals];

    res.status(200).json(allMeals);
})



module.exports = {createMeal,getDietary,getMeals,updateDieteryMeals,createDietery}    