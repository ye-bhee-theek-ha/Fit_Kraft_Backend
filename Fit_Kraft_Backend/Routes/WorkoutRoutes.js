const express = require("express");
const {createWorkout,getWorkout,updateUserWorkout,deleteWorkout,updateExcercises}=require('../controllers/Workoutcontroller')
const calculateWorkoutMetrics = require('../middleware/calculateWorkoutMetrics');
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");


router.post("/create", calculateWorkoutMetrics, createWorkout)
router.put("/update/:id", calculateWorkoutMetrics, updateUserWorkout)
router.put("/update/exercises/:id", calculateWorkoutMetrics, updateExcercises)
router.get("/get/:userId",getWorkout)   
router.delete("/delete/:id",deleteWorkout)  


module.exports=router
