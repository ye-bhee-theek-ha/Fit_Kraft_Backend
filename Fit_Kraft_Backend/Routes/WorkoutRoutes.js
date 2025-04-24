const express = require("express");
const {createWorkout,getWorkout,updateUserWorkout,updateExerciseDuration,deleteWorkout,updateExcercises,getWorkoutsLast7Days,updateExerciseCompletedStatus}=require('../controllers/Workoutcontroller')
const calculateWorkoutMetrics = require('../middleware/calculateWorkoutMetrics');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");


router.post("/create", calculateWorkoutMetrics, createWorkout)
router.put("/update/:id", calculateWorkoutMetrics, updateUserWorkout)//useless
router.put("/update/exercises/:id/:workoutid", calculateWorkoutMetrics, updateExcercises)//this adds exercise in workout array 
router.get("/get/:userId",getWorkout)
router.get('/get/last7days/:userid',getWorkoutsLast7Days)//for last 7 days
router.put('/update/duration/:userid/:workoutId/:exerciseId',updateExerciseDuration)   //for update exercise duration in workout it also autocalculates total duration 
router.delete("/delete/:id",deleteWorkout)  
router.put('/update/completestatue/:exerciseId',updateExerciseCompletedStatus) //for updating completed status of exercise


module.exports=router
