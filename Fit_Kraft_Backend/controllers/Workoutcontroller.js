const express =require('express')
const asyncHandler=require('express-async-handler')
const Workout = require('../Models/WorkoutModels')
const Exercise = require('../Models/ExerciseModel')
const Stored_Exercises = require('../Models/Stored_Exercises')


const createWorkout=asyncHandler(async(req,res)=>{
    try {
        const {userId,exercises,date}=req.body
        
        if (!userId || !exercises || !Array.isArray(exercises)) {
            return res.status(400).json({
                message: "UserId and exercises array are required"
            });
        }

        // Check and create exercises, reusing existing ones
        const exercisePromises = exercises.map(async exercise => {
            let existingExercise = await Exercise.findOne({ 
                name: { $regex: new RegExp(`^${exercise.name}$`, 'i') } 
            });
            
            if (!existingExercise) {
                // Only create new exercise if it doesn't exist
                existingExercise = await Exercise.create({
                    name: exercise.name,
                    type: exercise.type,
                    duration: exercise.duration,
                    sets: exercise.sets,
                    reps: exercise.reps,
                    weight: exercise.weight
                });
            }
            return existingExercise._id;
        });

        const exerciseIds = await Promise.all(exercisePromises);

        // Now create the workout with exercise IDs
        const workout=await Workout.create({
            userId,
            exercises: exerciseIds,
            duration: req.body.duration,        // Calculated by middleware
            caloriesBurned: req.body.caloriesBurned,    // Calculated by middleware
            date: date || new Date()
        })

        // Populate the exercises details in the response
        const populatedWorkout = await workout.populate('exercises');

        res.status(201).json({
            message: "Workout created successfully",
            workout: populatedWorkout
        });
    } catch (error) {
        res.status(500).json({
            message: "Error creating workout",
            error: error.message
        });
    }
})  
 
const getWorkout=asyncHandler(async(req,res)=>{
    const {userId} = req.params
    
    try {
        // Add debug logging for the query
        console.log('Searching for workouts with userId:', userId);
        
        const workouts = await Workout.find({userId})
            .populate({
                path: 'exercises',
                model: 'Exercise',
                select: 'name type duration sets reps weight'
            })
            .lean()
            .exec();

        if(!workouts || workouts.length === 0) {
            res.status(404)
            throw new Error('No workouts found for this user')
        }

       

        // Verify exercise documents exist
        for (const workout of workouts) {
            if (!workout.exercises || workout.exercises.length === 0) {
                console.log('Missing exercises for workout:', workout._id);
                // Check if the referenced exercises exist
                const exerciseCheck = await Exercise.find({
                    _id: { $in: workout.exercises }
                }).lean();
                console.log('Found exercises:', exerciseCheck);
            }
        }
        
        res.status(200).json(workouts)
    } catch (error) {
        console.error('Error in getWorkout:', error);
        res.status(500).json({
            message: "Error fetching workouts",
            error: error.message
        });
    }
})

const getWorkoutHistory = asyncHandler(async(req,res) => {//gets workout for date section 
    const {userId} = req.params
    
    // Calculate date 7 days ago from now
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const workouts = await Workout.find({
        userId,
        date: { $gte: sevenDaysAgo }
    })
    .populate('exercises')
    .sort({ date: -1 }); // Sort by date in descending order (newest first)
    
    if(!workouts.length) {
        res.status(404)
        throw new Error('No workouts found for this user in the last 7 days')
    }
    
    res.status(200).json(workouts)
})

const updateExcercises = asyncHandler(async(req, res) => {
    try {
        const { id } = req.params;
        const { exercises, userId } = req.body;
        
        if (!userId || !exercises || !Array.isArray(exercises)) {
            return res.status(400).json({
                message: "UserId and exercises array are required"
            });
        }

        // Check stored exercises and create new exercises
        const exercisePromises = exercises.map(async exercise => {
            // First check if exercise exists in stored exercises for this user
            let storedExercise = await Stored_Exercises.findOne({
                User_Created_ID: userId,
                name: { $regex: new RegExp(`^${exercise.name}$`, 'i') }
            });
            
            // If not found for this user, check if it exists without a user ID
            if (!storedExercise) {
                storedExercise = await Stored_Exercises.findOne({
                    User_Created_ID: { $exists: false },
                    name: { $regex: new RegExp(`^${exercise.name}$`, 'i') }
                });

                // If found without user ID, create a new one for this user
                if (storedExercise) {
                    storedExercise = await Stored_Exercises.create({
                        name: storedExercise.name,
                        description: storedExercise.description,
                        gifUrl: storedExercise.gifUrl,
                        bodyPart: storedExercise.bodyPart,
                        equipment: storedExercise.equipment,
                        User_Created_ID: userId
                    });
                } else {
                    // If not found at all, create new stored exercise for this user
                    storedExercise = await Stored_Exercises.create({
                        name: exercise.name,
                        type: exercise.type,
                        User_Created_ID: userId,
                        description: exercise.description || '',
                        bodyPart: exercise.bodyPart || '',
                        equipment: exercise.equipment || ''
                    });
                }
            }
            
            // Create new exercise instance for the workout
            const newExercise = await Exercise.create({
                name: exercise.name,
                type: exercise.type,
                duration: exercise.duration,
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight
            });

            return newExercise._id;
        });

        const exerciseIds = await Promise.all(exercisePromises);

        // Update workout with new exercise IDs
        const workout = await Workout.findById(id);
        if (!workout) {
            return res.status(404).json({
                message: "Workout not found"
            });
        }

        workout.exercises = exerciseIds;
        await workout.save();

        const updatedWorkout = await workout.populate('exercises');
        res.status(200).json({
            message: "Exercises updated successfully",
            workout: updatedWorkout
        });
    } catch (error) {
        console.error('Error in updateExercises:', error);
        res.status(500).json({
            message: "Error updating exercises",
            error: error.message
        });
    }
});

const updateUserWorkout=asyncHandler(async(req,res)=>{
    const {id}=req.params
    const {userId,exercises,duration,caloriesBurned,date}=req.body
    const workout=await Workout.findByIdAndUpdate(id,{userId,exercises,duration,caloriesBurned,date})
    res.status(200).json({message:"Workout updated successfully",workout})
})



const deleteWorkout=asyncHandler(async(req,res)=>{  
    const {id}=req.params
    const workout=await Workout.findByIdAndDelete(id)
    res.status(200).json({message:"Workout deleted successfully",workout})
})

const deleteExercise = asyncHandler(async(req, res) => {
    const {id} = req.params
    
    // Find and delete the exercise
    const exercise = await Exercise.findByIdAndDelete(id)
    
    if (!exercise) {
        return res.status(404).json({
            message: "Exercise not found"
        })
    }

    // Find all workouts containing this exercise
    const workouts = await Workout.find({ exercises: id })
    
    // Remove exercise from all workouts that contain it
    await Promise.all(workouts.map(async (workout) => {
        workout.exercises = workout.exercises.filter(exerciseId => 
            exerciseId.toString() !== id
        )
        await workout.save()
    }))

    res.status(200).json({
        message: "Exercise deleted successfully and removed from workouts",
        exercise
    })
})


const deleteWorkoutHistory=asyncHandler(async(req,res)=>{
    const {userId}=req.params
    
    // Calculate date 1 month ago
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Find and delete workouts older than 1 month
    const deletedWorkouts = await Workout.deleteMany({
        userId,
        date: { $lt: oneMonthAgo }
    });

    res.status(200).json({
        message: "Workout history older than 1 month deleted successfully",
        deletedCount: deletedWorkouts.deletedCount
    });
})

module.exports={createWorkout,getWorkout,updateUserWorkout,deleteWorkout,updateExcercises,deleteExercise,deleteWorkoutHistory}



