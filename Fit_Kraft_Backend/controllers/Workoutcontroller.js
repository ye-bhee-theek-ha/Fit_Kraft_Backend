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

module.exports = { createWorkout, getWorkout, updateUserWorkout, deleteWorkout, updateExcercises, deleteExercise, deleteWorkoutHistory, updateExerciseDuration,getWorkoutsLast7Days,updateExerciseCompletedStatus }



