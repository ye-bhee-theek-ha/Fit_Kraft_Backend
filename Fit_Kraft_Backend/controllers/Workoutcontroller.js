const express = require('express')
const asyncHandler = require('express-async-handler')
const Workout = require('../Models/WorkoutModels')
const Exercise = require('../Models/ExerciseModel')
const axios = require('axios');
const Stored_Exercises = require('../Models/Stored_Exercises')
const User=require('../Models/UserModel')
const PYTHON_API_URL = 'http://44.201.123.56:5000/generate-workout';
const WORKOUT_CREATE_URL = `http://localhost:4000/workout/create`;


const createWorkout = asyncHandler(async (req, res) => {
    try {
        const { userId, exercises, date } = req.body

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
        const workout = await Workout.create({
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

const getWorkout = asyncHandler(async (req, res) => {
    const { userId } = req.params

    try {
        // Add debug logging for the query
        console.log('Searching for workouts with userId:', userId);

        const workouts = await Workout.find({ userId })
            .populate({
                path: 'exercises',
                model: 'Exercise',
                select: 'name type duration sets reps weight'
            })
            .lean()
            .exec();

        if (!workouts || workouts.length === 0) {
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

const getWorkoutHistory = asyncHandler(async (req, res) => {//gets workout for date section 
    const { userId } = req.params

    // Calculate date 7 days ago from now
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const workouts = await Workout.find({
        userId,
        date: { $gte: sevenDaysAgo }
    })
        .populate('exercises')
        .sort({ date: -1 }); // Sort by date in descending order (newest first)

    if (!workouts.length) {
        res.status(404)
        throw new Error('No workouts found for this user in the last 7 days')
    }

    res.status(200).json(workouts)
})

const updateExcercises = asyncHandler(async (req, res) => {
    try {
        const { id: workoutId } = req.params; // Renamed 'id' to 'workoutId' for clarity
        const { exercises, userId } = req.body;

        if (!userId || !exercises || !Array.isArray(exercises)) {
            return res.status(400).json({
                message: "UserId and exercises array are required"
            });
        }

        const exercisePromises = exercises.map(async (exercise) => {
            let storedExercise;

            // Check for user-specific stored exercise
            storedExercise = await Stored_Exercises.findOne({
                User_Created_ID: userId,
                name: { $regex: new RegExp(`^${exercise.name}$`, 'i') }
            });

            // Check for global stored exercise if not found for user
            if (!storedExercise) {
                storedExercise = await Stored_Exercises.findOne({
                    User_Created_ID: { $exists: false },
                    name: { $regex: new RegExp(`^${exercise.name}$`, 'i') }
                });

                // Create user-specific stored exercise from global if found
                if (storedExercise) {
                    // Note: This creates a new user-specific copy if a global one is found
                    // and no user-specific one existed.
                    storedExercise = await Stored_Exercises.create({
                        name: storedExercise.name,
                        description: storedExercise.description,
                        gifUrl: storedExercise.gifUrl,
                        bodyPart: storedExercise.bodyPart,
                        equipment: storedExercise.equipment,
                        User_Created_ID: userId
                        // type might be missing here if it's on global and needs to be copied
                    });
                } else {
                    // Create new stored exercise if not found at all
                    storedExercise = await Stored_Exercises.create({
                        name: exercise.name,
                        type: exercise.type, // Ensure type is included when creating a new stored exercise
                        User_Created_ID: userId,
                        description: exercise.description || '',
                        gifUrl: exercise.gifUrl || '', // Added gifUrl if it's part of new exercise input
                        bodyPart: exercise.bodyPart || '',
                        equipment: exercise.equipment || ''
                    });
                }
            }
            // If storedExercise was found (either user-specific or a new one was created based on global/new input)
            // its ID isn't directly used in the 'Exercise' instance for the workout,
            // but the logic ensures the 'Stored_Exercises' collection is up-to-date.

            // Create new exercise instance for the workout
            const newExercise = await Exercise.create({
                name: exercise.name, // Or storedExercise.name if you want to ensure consistency
                type: exercise.type,   // Or storedExercise.type
                duration: exercise.duration,
                sets: exercise.sets,
                reps: exercise.reps,
                weight: exercise.weight
                // You might want to link newExercise to storedExercise._id if that's part of your data model
                // e.g., storedExerciseId: storedExercise._id
            });

            return newExercise._id;
        });

        const newExerciseIds = await Promise.all(exercisePromises);

        // Find the workout
        const workout = await Workout.findById(workoutId);
        if (!workout) {
            return res.status(404).json({ message: "Workout not found" });
        }

        // --- MODIFICATION START ---
        // Ensure workout.exercises is an array (it usually is if defined in schema)
        if (!Array.isArray(workout.exercises)) {
            workout.exercises = [];
        }

        // Append new exercise IDs to the existing list instead of replacing
        workout.exercises.push(...newExerciseIds);
        // Alternatively, you could use:
        // workout.exercises = workout.exercises.concat(newExerciseIds);
        // --- MODIFICATION END ---

        await workout.save();

        const updatedWorkout = await workout.populate('exercises');
        res.status(200).json({
            message: "Exercises updated successfully (appended to existing)",
            workout: updatedWorkout
        });
    } catch (error) {
        console.error('Error in updateExercises:', error);
        res.status(500).json({ message: "Error updating exercises", error: error.message });
    }
});



const updateUserWorkout = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { userId, exercises, duration, caloriesBurned, date } = req.body
    const workout = await Workout.findByIdAndUpdate(id, { userId, exercises, duration, caloriesBurned, date })
    res.status(200).json({ message: "Workout updated successfully", workout })
})


const updateExerciseDetails = asyncHandler(async (req, res) => {
    const { userid, workoutId, exerciseId } = req.params;
    const {
        name,
        type,
        duration, // Expected format: { minutes: number, seconds: number }
        minutes,  // Kept for backward compatibility if duration object is not sent
        seconds,  // Ke_pt for backward compatibility
        sets,
        reps,
        weight,
        completed
    } = req.body;

    // console.log('Request Params:', req.params);
    // console.log('Request Body:', req.body);

    try {
        // 1. Find the workout and verify ownership and existence
        const workout = await Workout.findOne({ _id: workoutId, userId: userid });

        if (!workout) {
            res.status(404);
            throw new Error('Workout not found or does not belong to the user.');
        }

        // 2. Check if the exercise is part of this workout
        //    (The original code uses findIndex which is fine for verification,
        //     but we fetch the Exercise document directly by exerciseId anyway)
        const exerciseExistsInWorkout = workout.exercises.find(
            (exRef) => exRef.toString() === exerciseId
        );

        if (!exerciseExistsInWorkout) {
            res.status(404);
            throw new Error('Exercise not found in this workout.');
        }

        // 3. Find the actual Exercise document
        const exerciseToUpdate = await Exercise.findById(exerciseId);
        if (!exerciseToUpdate) {
            res.status(404);
            throw new Error('Exercise document not found in the database.');
        }

        // 4. Update attributes if they are provided in the request body
        if (name !== undefined) exerciseToUpdate.name = name;
        if (type !== undefined) exerciseToUpdate.type = type;

        // Ensure exercise.duration object exists (it should due to schema defaults, but good practice)
        if (!exerciseToUpdate.duration) {
            exerciseToUpdate.duration = { minutes: 0, seconds: 0 };
        }

        // Handle duration update (prioritize 'duration' object, then individual 'minutes'/'seconds')
        if (duration && typeof duration === 'object') {
            if (duration.minutes !== undefined) {
                exerciseToUpdate.duration.minutes = parseInt(duration.minutes, 10);
            }
            if (duration.seconds !== undefined) {
                exerciseToUpdate.duration.seconds = parseInt(duration.seconds, 10);
            }
        } else { // Fallback for top-level minutes/seconds if duration object isn't provided
            if (minutes !== undefined) {
                exerciseToUpdate.duration.minutes = parseInt(minutes, 10);
            }
            if (seconds !== undefined) {
                exerciseToUpdate.duration.seconds = parseInt(seconds, 10);
            }
        }

        // Normalize duration: if parseInt results in NaN, default to 0 or its current value
        exerciseToUpdate.duration.minutes = isNaN(exerciseToUpdate.duration.minutes) ? 0 : exerciseToUpdate.duration.minutes;
        exerciseToUpdate.duration.seconds = isNaN(exerciseToUpdate.duration.seconds) ? 0 : exerciseToUpdate.duration.seconds;


        // Update other numeric and boolean fields
        // Mongoose will attempt type coercion (e.g., "5" to 5, "true" to true)
        if (sets !== undefined) exerciseToUpdate.sets = sets;
        if (reps !== undefined) exerciseToUpdate.reps = reps;
        if (weight !== undefined) exerciseToUpdate.weight = weight;
        if (completed !== undefined) exerciseToUpdate.completed = completed;

        await exerciseToUpdate.save();

        // 5. Recalculate Workout Total Duration (same as your "Embedded Middleware Logic")
        let totalWorkoutMinutes = 0;
        let totalWorkoutSeconds = 0;

        // Re-fetch the workout and populate exercises to get updated durations
        const populatedWorkout = await Workout.findById(workoutId).populate('exercises');

        if (populatedWorkout && populatedWorkout.exercises) {
            for (const ex of populatedWorkout.exercises) {
                // Ensure ex.duration exists and its properties are numbers
                if (ex.duration) {
                    totalWorkoutMinutes += Number(ex.duration.minutes) || 0;
                    totalWorkoutSeconds += Number(ex.duration.seconds) || 0;
                }
            }

            // Ensure populatedWorkout.duration object exists before assignment
            if (!populatedWorkout.duration) {
                populatedWorkout.duration = { minutes: 0, seconds: 0 };
            }

            populatedWorkout.duration.minutes = Math.floor(totalWorkoutMinutes + totalWorkoutSeconds / 60);
            populatedWorkout.duration.seconds = totalWorkoutSeconds % 60;
            await populatedWorkout.save(); // Save the workout with updated total duration

            res.status(200).json(populatedWorkout);
        } else {
            // This case might occur if the workout was deleted by another process,
            // or if exercises array is unexpectedly empty after population.
            // Sending the updated exercise might be an alternative if workout update fails.
             console.error('Error: Populated workout or its exercises not found for duration update.');
            res.status(200).json({
                message: 'Exercise updated, but failed to recalculate workout total duration as workout data was inconsistent.',
                updatedExercise: exerciseToUpdate // Optionally send back the updated exercise
            });
        }

    } catch (error) {
        console.error('Error updating exercise details:', error);
        // If res.status() was called before throw, that status might not be on error object.
        // asyncHandler should pass error to a central error handler.
        // If handling here, ensure status code reflects the error.
        if (!res.headersSent) {
            const statusCode = res.statusCode >= 400 ? res.statusCode : 500; // Use status if already set by preceding res.status()
            res.status(statusCode).json({ message: error.message || 'Failed to update exercise details' });
        }
        // If headers were sent, the error is logged, but response cannot be changed.
    }
});


const getWorkoutsLast7Days = asyncHandler(async (req, res) => {
    
    const { userId } = req.params;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    // Normalize to full day range
    sevenDaysAgo.setHours(0, 0, 0, 0);
    now.setHours(23, 59, 59, 999);

    try {
        const workouts = await Workout.find({
            userId: userId,
            date: {
                $gte: sevenDaysAgo,
                $lte: now
            }
        })
            .populate({
                path: 'exercises',
                model: 'Exercise',
                select: 'name type duration sets reps weight completed'
            })
            .sort({ date: -1 });

        res.status(200).json(workouts);

    } catch (error) {
        console.error('Error fetching workouts for the last 7 days:', error);
        res.status(500).json({ message: 'Failed to fetch workouts', error: error.message });
    }
});



const updateExerciseCompletedStatus = asyncHandler(async (req, res) => {
    const { exerciseId } = req.params;
    const { completed } = req.body;
  
    if (typeof completed !== 'boolean') {
      res.status(400);
      throw new Error('Missing or invalid "completed" field in the request body');
    }
  
    try {
      // Update the 'completed' status of the Exercise document directly
      const updatedExercise = await Exercise.findByIdAndUpdate(
        exerciseId,
        { completed: completed },
        { new: true } // Return the updated document
      );
  
      if (!updatedExercise) {
        res.status(404);
        throw new Error('Exercise document not found');
      }
  
      res.status(200).json(updatedExercise);
  
    } catch (error) {
      console.error('Error updating exercise completed status:', error);
      res.status(500).json({ message: 'Failed to update exercise status', error: error.message });
    }
  });



const deleteWorkout = asyncHandler(async (req, res) => {
    const { id } = req.params
    const workout = await Workout.findByIdAndDelete(id)
    res.status(200).json({ message: "Workout deleted successfully", workout })
})

const deleteExercise = asyncHandler(async (req, res) => {
    const { id } = req.params

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


const deleteWorkoutHistory = asyncHandler(async (req, res) => {
    const { userId } = req.params

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


async function recalculateWorkoutTotals(workoutId) {
    try {
        console.log(`Recalculating totals for workout: ${workoutId}`);
        const workoutToRecalculate = await Workout.findById(workoutId).populate('exercises');
        if (!workoutToRecalculate) {
            console.error(`Workout ${workoutId} not found for recalculation.`);
            return;
        }

        let totalMinutes = 0;
        let totalSeconds = 0;
        let totalCalories = 0;

        workoutToRecalculate.exercises.forEach(ex => {
            // Ensure individual exercises have duration and calories calculated/stored properly
            if (ex.duration) {
                totalMinutes += ex.duration.minutes || 0;
                totalSeconds += ex.duration.seconds || 0;
            }
            // Assuming individual exercises have a 'caloriesBurned' field
            totalCalories += ex.caloriesBurned || 0;
        });

        // Consolidate seconds into minutes
        totalMinutes += Math.floor(totalSeconds / 60);
        totalSeconds = totalSeconds % 60;

        // Update the workout document
        workoutToRecalculate.duration = { minutes: totalMinutes, seconds: totalSeconds };
        workoutToRecalculate.caloriesBurned = totalCalories;

        // Save the updated totals
        await workoutToRecalculate.save();
        console.log(`Successfully recalculated totals for workout: ${workoutId}`);

    } catch (error) {
        console.error(`Error recalculating totals for workout ${workoutId}:`, error);
        // Decide if you need to throw or just log the error
    }
}

// Update a specific exercise instance within a workout
async function recalculateWorkoutTotals(workoutId) {
    try {
        console.log(`Recalculating totals for workout: ${workoutId}`);
        const workoutToRecalculate = await Workout.findById(workoutId).populate('exercises');
        if (!workoutToRecalculate) {
            console.error(`Workout ${workoutId} not found for recalculation.`);
            return;
        }

        let totalMinutes = 0;
        let totalSeconds = 0;
        let totalCalories = 0;

        workoutToRecalculate.exercises.forEach(ex => {
            // Ensure individual exercises have duration and calories calculated/stored properly
            if (ex.duration) {
                totalMinutes += ex.duration.minutes || 0;
                totalSeconds += ex.duration.seconds || 0;
            }
            // Assuming individual exercises have a 'caloriesBurned' field
            totalCalories += ex.caloriesBurned || 0;
        });

        // Consolidate seconds into minutes
        totalMinutes += Math.floor(totalSeconds / 60);
        totalSeconds = totalSeconds % 60;

        // Update the workout document
        workoutToRecalculate.duration = { minutes: totalMinutes, seconds: totalSeconds };
        workoutToRecalculate.caloriesBurned = totalCalories;

        // Save the updated totals
        await workoutToRecalculate.save();
        console.log(`Successfully recalculated totals for workout: ${workoutId}`);

    } catch (error) {
        console.error(`Error recalculating totals for workout ${workoutId}:`, error);
        // Decide if you need to throw or just log the error
    }
}

const addExerciseToWorkout = asyncHandler(async (req, res) => {
    const { workoutId } = req.params;
    const exerciseData = req.body; // Expect ExerciseFormData structure

    // if (!mongoose.Types.ObjectId.isValid(workoutId)) {
    //     return res.status(400).json({ message: "Invalid Workout ID format" });
    // }
    // // Basic validation for incoming exercise data
    // if (!exerciseData || !exerciseData.name || !exerciseData.duration) {
    //     return res.status(400).json({ message: "Missing required exercise fields (name, duration)" });
    // }

    try {
        const workout = await Workout.findById(workoutId);
        if (!workout) {
            return res.status(404).json({ message: "Workout not found" });
        }

        // Create the new Exercise document instance
        // Note: Consider adding error handling for Exercise.create itself
        const newExercise = await Exercise.create({
            name: exerciseData.name,
            type: exerciseData.type, // Ensure 'type' is handled correctly if optional
            duration: exerciseData.duration,
            sets: exerciseData.sets,
            reps: exerciseData.reps,
            weight: exerciseData.weight,
            completed: false, // Default new exercises to not completed
            // Add any other relevant fields from exerciseData
            // DO NOT add caloriesBurned here unless it's sent from client for the single exercise
        });

        // Add the new exercise's ID to the workout's exercises array
        // Use $push for atomicity if possible, otherwise push and save workout
        workout.exercises.push(newExercise._id);
        await workout.save(); // Save the workout document with the added exercise reference

        // --- Recalculate Totals AFTER adding the exercise ---
        // Call the helper function to update workout totals
        await recalculateWorkoutTotals(workoutId);

        // --- REMOVED FAULTY LOGIC ---
        // workout.duration = req.body.duration; // Incorrect
        // workout.caloriesBurned = req.body.caloriesBurned; // Incorrect
        // await workout.save(); // Incorrect - caused validation error & was redundant
        // --- END REMOVED FAULTY LOGIC ---

        // Populate the workout fully for the response AFTER recalculation
        const finalUpdatedWorkout = await Workout.findById(workoutId)
            .populate({
                path: 'exercises',
                model: 'Exercise',
                // Select fields needed for the frontend display
                select: 'name type duration sets reps weight completed caloriesBurned _id'
            });

        res.status(201).json({ // Use 201 Created for adding a resource
            message: "Exercise added successfully",
            workout: finalUpdatedWorkout // Send the fully updated workout
        });

    } catch (error) {
        console.error('Error adding exercise to workout:', error);
        // Handle potential validation errors from Exercise.create or workout.save
        if (error.name === 'ValidationError') {
             let validationMessage = error.message || "Validation failed";
             if (error.errors) {
                 validationMessage = Object.values(error.errors).map(e => e.message).join(', ');
             }
            return res.status(400).json({ message: validationMessage , error: error.errors });
        }
        res.status(500).json({ message: "Failed to add exercise", error: error.message });
    }
});

const updateExerciseInWorkout = asyncHandler(async (req, res) => {
    const { workoutId, exerciseId } = req.params;
    const updatedData = req.body;

    // if (!mongoose.Types.ObjectId.isValid(workoutId) || !mongoose.Types.ObjectId.isValid(exerciseId)) {
    //     return res.status(400).json({ message: "Invalid Workout or Exercise ID format" });
    // }
    // if (!updatedData || Object.keys(updatedData).length === 0) {
    //     return res.status(400).json({ message: "No update data provided for exercise" });
    // }

    // Keep these deletions - prevent direct modification of certain fields
    delete updatedData._id;
    delete updatedData.completed;
    delete updatedData.caloriesBurned; // Prevent client sending calories for single exercise

    try {
        // Check if exercise exists within the specified workout first (optional but good)
        // Note: This requires the workout to already have the exercise ID in its array.
        // If exercises are only linked from Exercise -> Workout, this check might fail.
        // Consider just checking if the Exercise doc exists.
        const exerciseExists = await Exercise.findById(exerciseId);
        if (!exerciseExists) {
             return res.status(404).json({ message: "Exercise document not found" });
        }
        // Optional: Check if the exercise belongs to the user's workout if needed for security.

        // Find and update the Exercise document directly
        const updatedExercise = await Exercise.findByIdAndUpdate(
            exerciseId,
            { $set: updatedData },
            { new: true, runValidators: true }
        );

        if (!updatedExercise) {
            // This case might be redundant if the existence check above is done,
            // but keep it as a safeguard.
            return res.status(404).json({ message: "Exercise document could not be updated" });
        }

        // --- REMOVED FAULTY LOGIC ---
        // workout.duration = req.body.duration; // Incorrect: uses single exercise data
        // workout.caloriesBurned = req.body.caloriesBurned; // Incorrect: undefined
        // await workout.save(); // Incorrect: causes validation error
        // --- END REMOVED FAULTY LOGIC ---

        // --- STRATEGY FOR RECALCULATION ---
        // Choose ONE strategy:
        // 1. Call a helper function *after* successful update:
        await recalculateWorkoutTotals(workoutId);
        // 2. Rely on Mongoose middleware/hooks on the Exercise schema to update the parent.
        // 3. Rely on the `calculateWorkoutMetrics` middleware *if* it's designed to run *after* the update
        //    (which is unusual for route middleware placement).
        // 4. Do nothing here and handle recalculation via a separate API call or background job.

        // For this fix, we'll call the helper function explicitly (Strategy 1).

        // Populate workout for response AFTER recalculation (if called)
        const finalUpdatedWorkout = await Workout.findById(workoutId)
            .populate({
                path: 'exercises',
                model: 'Exercise',
                // Ensure necessary fields for display and recalculation are selected
                select: 'name type duration sets reps weight completed caloriesBurned _id'
            });

        res.status(200).json({
            message: "Exercise updated successfully",
            workout: finalUpdatedWorkout // Return updated workout session with fresh totals
        });

    } catch (error) {
        console.error('Error updating exercise in workout:', error);
        if (error.name === 'ValidationError') {
            // Provide more specific validation error details if possible
             let validationMessage = error.message || "Validation failed";
             if (error.errors) {
                 validationMessage = Object.values(error.errors).map(e => e.message).join(', ');
             }
            return res.status(400).json({ message: validationMessage , error: error.errors }); // Send specific field errors
        }
        res.status(500).json({ message: "Failed to update exercise", error: error.message });
    }
});

// Remove a specific exercise instance from a workout
const removeExerciseFromWorkout = asyncHandler(async (req, res) => {
    const { workoutId, exerciseId } = req.params;

    // if (!mongoose.Types.ObjectId.isValid(workoutId) || !mongoose.Types.ObjectId.isValid(exerciseId)) {
    //     return res.status(400).json({ message: "Invalid Workout or Exercise ID format" });
    // }

    try {
        // 1. Find the workout and pull the exercise ID from its array atomically
        const workoutUpdateResult = await Workout.findByIdAndUpdate(
            workoutId,
            { $pull: { exercises: exerciseId } }, // Use $pull to remove the ID
            { new: false, useFindAndModify: false } // Don't need the returned doc immediately
        );

        // Check if the workout existed and the pull operation potentially modified it
        if (!workoutUpdateResult) {
            // If workout wasn't found, the exercise couldn't have been in it anyway
            return res.status(404).json({ message: "Workout not found" });
        }
        // Note: $pull doesn't error if the item wasn't in the array, so we proceed.

        // 2. Optional but recommended: Delete the Exercise document itself
        // Be careful if exercises can be shared between workouts or logs
        try {
            const deletedExercise = await Exercise.findByIdAndDelete(exerciseId);
            if (deletedExercise) {
                console.log(`Deleted Exercise document ${exerciseId}`);
            } else {
                // This isn't necessarily an error, the exercise might have been deleted already
                console.warn(`Exercise document ${exerciseId} not found for deletion (might be already deleted).`);
            }
        } catch (deleteError) {
             // Log deletion error but potentially continue to allow workout totals recalc
             console.error(`Error deleting Exercise document ${exerciseId}:`, deleteError);
        }


        // --- REMOVED FAULTY LOGIC ---
        // workout.duration = req.body.duration; // Incorrect
        // workout.caloriesBurned = req.body.caloriesBurned; // Incorrect
        // await workout.save(); // Incorrect - would cause validation error
        // --- END REMOVED FAULTY LOGIC ---


        // 3. Recalculate totals for the parent workout AFTER removal/deletion
        await recalculateWorkoutTotals(workoutId);


        // 4. Populate workout fully for the response AFTER recalculation
        const finalUpdatedWorkout = await Workout.findById(workoutId)
            .populate({
                path: 'exercises', // Populate remaining exercises
                model: 'Exercise',
                select: 'name type duration sets reps weight completed caloriesBurned _id'
            });

         // Handle case where workout might have been deleted between steps (unlikely but possible)
         if (!finalUpdatedWorkout) {
            return res.status(404).json({ message: "Workout not found after update." });
         }

        res.status(200).json({
            message: "Exercise removed successfully",
            workout: finalUpdatedWorkout // Send updated workout with recalculated totals
        });

    } catch (error) {
        console.error('Error removing exercise from workout:', error);
         // Handle CastError (e.g., invalid ObjectId format passed somewhere unexpected)
        if (error.name === 'CastError') {
             return res.status(400).json({ message: `Invalid data format: ${error.message}`, error: error });
        }
        // Generic server error
        res.status(500).json({ message: "Failed to remove exercise due to a server error", error: error.message });
    }
});



//Helper code for LLM preprocessing 
function preprocess_history_for_llm(last_week_workout_input) {
    // ... (Keep the exact same implementation as the last version) ...
    // This function transforms the input history into a format suitable for the LLM prompt.
    // For brevity, not repeating the full code here. It should be the same as before.
    const processed_history = [];
    if (!Array.isArray(last_week_workout_input) || !last_week_workout_input.length) {
        return processed_history;
    }
    try {
        // Ensure dates are comparable and sort
        const historyWithParsedDates = last_week_workout_input.map(entry => {
            let parsed_date = entry.date instanceof Date ? entry.date : new Date(0); // Default for unparseable
            if (typeof entry.date === 'string') {
                try {
                    parsed_date = new Date(entry.date.endsWith('Z') ? entry.date : entry.date + 'Z');
                } catch (e) { console.warn(`Could not parse date string: ${entry.date}`); }
            }
            return {...entry, parsed_date};
        }).sort((a, b) => b.parsed_date - a.parsed_date);

        for (const day_workout of historyWithParsedDates.slice(0, 7)) {
            const day_exercises_for_llm = [];
            if (!Array.isArray(day_workout.exercises)) continue;

            for (const ex_hist of day_workout.exercises) {
                if (!ex_hist || typeof ex_hist !== 'object' || !ex_hist.name) continue;
                const llm_ex_hist = {
                    name: ex_hist.name,
                    type: ex_hist.type || "Unknown",
                    duration: ex_hist.duration || { minutes: 0, seconds: 0 },
                    sets: typeof ex_hist.sets === 'number' ? ex_hist.sets : null,
                    reps: typeof ex_hist.reps === 'number' ? ex_hist.reps : null,
                    weight: typeof ex_hist.weight === 'number' ? ex_hist.weight : null,
                    completed: ex_hist.completed || false
                };
                if (llm_ex_hist.reps === null && llm_ex_hist.duration && (llm_ex_hist.duration.minutes > 0 || llm_ex_hist.duration.seconds > 0)) {
                    llm_ex_hist.reps = 1;
                }
                day_exercises_for_llm.push(llm_ex_hist);
            }
            if (day_exercises_for_llm.length > 0) {
                let history_date_str = "Unknown Past Day";
                if (day_workout.parsed_date && day_workout.parsed_date.getTime() !== new Date(0).getTime()) {
                     // Format as YYYY-MM-DD (DayOfWeek)
                    history_date_str = `${day_workout.parsed_date.getFullYear()}-${String(day_workout.parsed_date.getMonth() + 1).padStart(2, '0')}-${String(day_workout.parsed_date.getDate()).padStart(2, '0')} (${day_workout.parsed_date.toLocaleDateString('en-US', { weekday: 'long' })})`;
                }
                processed_history.push({
                    day_identifier: history_date_str,
                    exercises: day_exercises_for_llm
                });
            }
        }
    } catch (e) {
        console.warn(`Error processing workout history: ${e.message}`);
    }
    return processed_history;
}

// --- Helper Function to Infer Experience Level ---
function infer_experience_level(activity_level_str) {
    // ... (Keep the exact same implementation as the last version) ...
    if (!activity_level_str || typeof activity_level_str !== 'string') {
        return "Beginner"; 
    }
    const activity_level_lower = activity_level_str.toLowerCase();
    if (activity_level_lower.includes("sedentary") || activity_level_lower.includes("lightly active")) {
        return "Beginner";
    } else if (activity_level_lower.includes("moderately active")) {
        return "Intermediate";
    } else if (activity_level_lower.includes("very active") || activity_level_lower.includes("extremely active")) {
        return "Advanced";
    }
    return "Beginner";
}


const generate_workout=asyncHandler(async (req, res) => {
    try {
        const { userId } = req.params;
        const requestBody = req.body || {}; 
        const planning_preferences_from_req = requestBody.planning_preferences || {};

        if (!userId) {
            return res.status(400).json({ message: "userId path parameter is required." });
        }

        const userFromDb = await User.findById(userId); // Your mock or real DB call
        if (!userFromDb) {
            console.error(`User not found in DB for ID: ${userId}`);
            return res.status(404).json({ message: `User with ID ${userId} not found.` });
        }
        console.log(`Workspaceed user from DB: ${userFromDb.name}`);

        const userDataForPythonApi = { /* ... (same as before, extracting relevant fields from userFromDb) ... */
            name: userFromDb.name, nickname: userFromDb.nickname, email: userFromDb.email,
            height: userFromDb.height, weight: userFromDb.weight, age: userFromDb.age,
            gender: userFromDb.gender, goal: userFromDb.goal, activityLevel: userFromDb.activityLevel,
            bmi: userFromDb.bmi, bmr: userFromDb.bmr
        };

        let lastWeekWorkoutData = [];
        const historyUrl = `http://localhost:5000/workout/get/last7days/${userId}`;
        try {
            console.log(`Workspaceing last 7 days workout history from: ${historyUrl}`);
            const historyResponse = await axios.get(historyUrl);
            if (historyResponse.data && Array.isArray(historyResponse.data)) {
                lastWeekWorkoutData = historyResponse.data;
                console.log(`Workspaceed ${lastWeekWorkoutData.length} workout entries from history.`);
            } else {
                console.log(`No workout history found or invalid format for user ${userId}.`);
            }
        } catch (historyError) {
            console.warn(`Could not fetch workout history for user ${userId}: ${historyError.message}.`);
        }
        
        const experienceLevel = planning_preferences_from_req.experienceLevel || infer_experience_level(userFromDb.activityLevel);
        const availableDaysForNewPlan = planning_preferences_from_req.availableDaysForNewPlan || 5;
        const timePerSessionMinutes = planning_preferences_from_req.timePerSessionMinutes || 60;
        const availableEquipment = planning_preferences_from_req.availableEquipment || ["Bodyweight", "Dumbbells"];

        const pythonApiPayload = {
            user: userDataForPythonApi,
            availableDaysForNewPlan: availableDaysForNewPlan||5,
            timePerSessionMinutes: timePerSessionMinutes||60,
            availableEquipment: availableEquipment,
            experienceLevel: experienceLevel,
            lastWeekWorkout: lastWeekWorkoutData // This is the raw history from /get/last7days
        };

        console.log(`Calling Python API at ${PYTHON_API_URL} for user: ${userId}`);
        let generatedPlanResponse;
        try {
            generatedPlanResponse = await axios.post(PYTHON_API_URL, pythonApiPayload,{
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (pythonError) {
            console.error('Error calling Python Flask API:', pythonError.response ? JSON.stringify(pythonError.response.data, null, 2) : pythonError.message);
            return res.status(pythonError.response?.status || 500).json({
                message: 'Failed to get workout plan from Python API.',
                error: pythonError.response ? pythonError.response.data : pythonError.message
            });
        }

        const planData = generatedPlanResponse.data; // This should be the { workout_schedule: [...] } object

        
        let is_valid_format = true;
        const validation_errors = [];
        const expected_days = pythonApiPayload.availableDaysForNewPlan || 5; // Use what was requested

        if (!planData || typeof planData !== 'object' || !planData.workout_schedule || !Array.isArray(planData.workout_schedule)) {
            is_valid_format = false;
            validation_errors.push("Invalid top-level JSON structure: missing 'workout_schedule' array.");
        } else if (planData.workout_schedule.length !== expected_days) {
            is_valid_format = false;
            validation_errors.push(`Plan does NOT contain ${expected_days} workout days. Received ${planData.workout_schedule.length} days.`);
        } else {
            for (const day_idx in planData.workout_schedule) {
                const day_plan = planData.workout_schedule[day_idx];
                const day_label = day_plan.date || `Day ${parseInt(day_idx) + 1}`;

                if (!day_plan.date || typeof day_plan.date !== 'string') {
                    is_valid_format = false; validation_errors.push(`Day ${day_label} missing or invalid 'date'.`);
                } else {
                    try { new Date(day_plan.date).toISOString().split('T')[0]; } // Basic check for YYYY-MM-DD like format
                    catch (e) { is_valid_format = false; validation_errors.push(`Invalid date format for '${day_plan.date}' in ${day_label}.`);}
                }

                if (!day_plan.exercises || !Array.isArray(day_plan.exercises) || (expected_days > 0 && day_plan.exercises.length === 0)) {
                    is_valid_format = false; validation_errors.push(`Day ${day_label} missing or empty 'exercises' array.`);
                } else if (Array.isArray(day_plan.exercises)) {
                    for (const ex_idx in day_plan.exercises) {
                        const ex = day_plan.exercises[ex_idx];
                        const ex_label = ex.name || `Exercise ${parseInt(ex_idx) + 1}`;
                        if (!ex.name || typeof ex.name !== 'string' ||
                            !ex.type || typeof ex.type !== 'string' ||
                            !ex.duration || typeof ex.duration !== 'object' ||
                            typeof ex.duration.minutes !== 'number' || typeof ex.duration.seconds !== 'number' ||
                            (ex.sets !== null && typeof ex.sets !== 'number') ||      // sets can be null or number
                            (ex.reps !== null && typeof ex.reps !== 'number') ||      // reps can be null or number
                            (ex.weight !== null && typeof ex.weight !== 'number') ||  // weight can be null or number
                            typeof ex.completed !== 'boolean') {
                            is_valid_format = false;
                            validation_errors.push(`Exercise ${ex_label} in ${day_label} has missing/invalid fields or types.`);
                        }
                    }
                }
            }
        }

        if (!is_valid_format) {
            console.error(`LLM output failed structural validation for user ${userId}:`, validation_errors);
            return res.status(422).json({ // Unprocessable Entity
                message: 'Generated plan from AI service failed structural validation.',
                errors: validation_errors,
                raw_output: planData 
            });
        }

        // If we reach here, the plan has the correct JSON structure.
        // Proceed to create workouts with the exercise details as provided by LLM.
        const workout_schedule = planData.workout_schedule;
        console.log(`Validated ${workout_schedule.length} day(s) in the plan. Processing each day...`);
        const createdWorkoutsInfo = [];

        for (const dayPlan of workout_schedule) {
            // **CRITICAL CHANGE**: We now send the exercise detail objects directly.
            // Your /workout/create endpoint and Mongoose schema must be able to handle this.
            const exercisesToCreate = dayPlan.exercises.map(ex => ({
                name: ex.name,
                type: ex.type,
                duration: ex.duration, 
                sets: ex.sets,       
                reps: ex.reps,       
                weight: ex.weight,     
                completed: ex.completed // Should be false
            }));

            const workoutToCreatePayload = {
                userId: userId,
                date: dayPlan.date,       
                exercises: exercisesToCreate 
            };

            try {
                console.log(`Sending POST to ${WORKOUT_CREATE_URL} for date: ${dayPlan.date} with ${exercisesToCreate.length} exercises`);
                const createResponse = await axios.post('http://localhost:5000/workout/create', workoutToCreatePayload);
                console.log(`Workout for ${dayPlan.date} created successfully, ID: ${createResponse.data._id}`);
                createdWorkoutsInfo.push({
                    date: dayPlan.date,
                    status: "created",
                    workoutId: createResponse.data._id, // Assuming response contains the created workout's ID
                    numExercises: exercisesToCreate.length
                });
            } catch (createError) {
                console.error(`Failed to create workout for ${dayPlan.date}:`, createError.response ? JSON.stringify(createError.response.data, null, 2) : createError.message);
                createdWorkoutsInfo.push({
                    date: dayPlan.date,
                    status: "failed_to_create_in_db",
                    error: createError.response ? createError.response.data : createError.message,
                    numExercisesAttempted: exercisesToCreate.length
                });
            }
        }

        res.status(201).json({
            message: `Weekly plan generation processed. See summary for details.`,
            userId: userId,
            requestedDaysInPlan: workout_schedule.length,
            creationSummary: createdWorkoutsInfo
        });

    } catch (error) {
        console.error('Error in /generate/:userId controller:', error.message, error.stack);
        res.status(500).json({ message: 'Internal server error in Node.js controller', error: error.message });
    }


})

module.exports = { createWorkout, getWorkout, updateUserWorkout, deleteWorkout, updateExcercises, deleteExercise, deleteWorkoutHistory, updateExerciseDetails,getWorkoutsLast7Days,updateExerciseCompletedStatus,    addExerciseToWorkout,
    updateExerciseInWorkout,
    removeExerciseFromWorkout,generate_workout}



