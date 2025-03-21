const express = require("express");
const {createExercise,getAllExercises,getExercisebyName,createStoredExercises}=require('../controllers/Excercisecontroller')
const router = express.Router();

router.route('/create').post(createExercise)
router.route('/get').get(getAllExercises)
router.route('/get/:name').get(getExercisebyName)
router.route('/createStored').post(createStoredExercises)


module.exports=router   