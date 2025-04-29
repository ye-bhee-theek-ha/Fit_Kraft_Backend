const express = require('express')
const asyncHandler = require('express-async-handler')
const Workout = require('../Models/WorkoutModels')
const Exercise = require('../Models/ExerciseModel')
const Stored_Exercises = require('../Models/Stored_Exercises')


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
            storedExercise = await Stored_Exercises.create({
              name: storedExercise.name,
              description: storedExercise.description,
              gifUrl: storedExercise.gifUrl,
              bodyPart: storedExercise.bodyPart,
              equipment: storedExercise.equipment,
              User_Created_ID: userId
            });
          } else {
            // Create new stored exercise if not found at all
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
      const workout = await Workout.findById(workoutId);
      if (!workout) {
        return res.status(404).json({ message: "Workout not found" });
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
      res.status(500).json({ message: "Error updating exercises", error: error.message });
    }
  });

const updateUserWorkout = asyncHandler(async (req, res) => {
    const { id } = req.params
    const { userId, exercises, duration, caloriesBurned, date } = req.body
    const workout = await Workout.findByIdAndUpdate(id, { userId, exercises, duration, caloriesBurned, date })
    res.status(200).json({ message: "Workout updated successfully", workout })
})

const updateExerciseDuration = asyncHandler(async (req, res) => {
    const { userid, workoutId, exerciseId } = req.params;
    const { minutes = 0, seconds = 0 } = req.body;
    console.log(req.params)
    try {
        const workout = await Workout.findOne({ _id: workoutId, userId:userid });

        if (!workout) {
            res.status(404);
            throw new Error('Workout not found');
        }

        const exerciseToUpdateIndex = workout.exercises.findIndex(
            (exercise) => exercise.toString() === exerciseId
        );

        if (exerciseToUpdateIndex === -1) {
            res.status(404);
            throw new Error('Exercise not found in this workout');
        }

        // Find the actual Exercise document to update its duration
        const exercise = await Exercise.findById(exerciseId);
        if (!exercise) {
            res.status(404);
            throw new Error('Exercise document not found');
        }

        exercise.duration.minutes = minutes;
        exercise.duration.seconds = seconds;
        await exercise.save();

        // --- Embedded Middleware Logic ---
        let totalMinutes = 0;
        let totalSeconds = 0;

        // Populate exercises to access their duration
        const populatedWorkout = await Workout.findById(workoutId).populate('exercises');

        if (populatedWorkout && populatedWorkout.exercises) {
            for (const ex of populatedWorkout.exercises) {
                totalMinutes += ex.duration.minutes || 0;
                totalSeconds += ex.duration.seconds || 0;
            }

            populatedWorkout.duration.minutes = Math.floor(totalMinutes + totalSeconds / 60);
            populatedWorkout.duration.seconds = totalSeconds % 60;
            await populatedWorkout.save(); // Save the workout with updated total duration
            res.status(200).json(populatedWorkout);
        } else {
            // Handle the case where populating exercises failed or workout is gone
            res.status(500).json({ message: 'Error updating workout duration' });
        }
        // --- End of Embedded Middleware Logic ---

    } catch (error) {
        console.error('Error updating exercise duration:', error);
        res.status(500).json({ message: 'Failed to update exercise duration', error: error.message });
    }
});



const getWorkoutsLast7Days = asyncHandler(async (req, res) => {
    const { userid } = req.params;
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    try {
        const workouts = await Workout.find({
            userId: userid,
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
            .sort({ date: -1 }); // Sort by date in descending order (newest first)

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


module.exports = { createWorkout, getWorkout, updateUserWorkout, deleteWorkout, updateExcercises, deleteExercise, deleteWorkoutHistory, updateExerciseDuration,getWorkoutsLast7Days,updateExerciseCompletedStatus,    addExerciseToWorkout,
    updateExerciseInWorkout,
    removeExerciseFromWorkout, }



