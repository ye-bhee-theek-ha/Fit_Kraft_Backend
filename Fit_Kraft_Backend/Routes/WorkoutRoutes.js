const express = require("express");
const {createWorkout,getWorkout,updateUserWorkout,updateExerciseDetails,deleteWorkout,updateExcercises,getWorkoutsLast7Days,updateExerciseCompletedStatus, addExerciseToWorkout, updateExerciseInWorkout, removeExerciseFromWorkout,generate_workout}=require('../controllers/Workoutcontroller')
const calculateWorkoutMetrics = require('../middleware/calculateWorkoutMetrics');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");


router.post("/create", calculateWorkoutMetrics, createWorkout)
router.put("/update/:id", calculateWorkoutMetrics, updateUserWorkout)//useless
router.put("/update/exercises/:id/:workoutid", calculateWorkoutMetrics, updateExcercises)//this adds exercise in workout array 
router.get("/get/:userId",getWorkout)
router.get('/get/last7days/:userId',getWorkoutsLast7Days)//for last 7 days
router.put('/update/duration/:userid/:workoutId/:exerciseId',updateExerciseDetails)   //for update exercise duration in workout it also autocalculates total duration 
router.delete("/delete/:id",deleteWorkout)  
router.put('/update/completestatus/:exerciseId',updateExerciseCompletedStatus) //for updating completed status of exercise
router.post('/generate/:userId',generate_workout)

// Add a single exercise to a specific workout
// POST /workout/:workoutId/exercises
router.post("/:workoutId/exercises", addExerciseToWorkout);

// Update a single exercise within a specific workout
// PUT /workout/:workoutId/exercises/:exerciseId
router.put("/:workoutId/exercises/:exerciseId", updateExerciseInWorkout);

// Remove a single exercise from a specific workout
// DELETE /workout/:workoutId/exercises/:exerciseId
router.delete("/:workoutId/exercises/:exerciseId", removeExerciseFromWorkout);


module.exports=router
