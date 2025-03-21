const Exercise = require('../Models/ExerciseModel')
const asyncHandler=require('express-async-handler')
const Stored_Exercises = require('../Models/Stored_Exercises')


const createExercise = asyncHandler(async(req,res)=>{
    const {name,type,duration,sets,reps,weight}=req.body
    const exercise=await Exercise.create({name,type,duration,sets,reps,weight})
    res.status(201).json({message:"Exercise created successfully",exercise})
})


const createStoredExercises=asyncHandler(async(req,res)=>{
    const {name,description,gifUrl,bodyPart,equipment}=req.body
    const storedExercises=await Stored_Exercises.create({name,description,gifUrl,bodyPart,equipment})
    res.status(201).json(storedExercises)
})

const getAllExercises = asyncHandler(async(req,res)=>{
    const exercises=await Exercise.find()
    if(!exercises) {
        res.status(404)
        throw new Error('No exercises found')
    }
    res.status(200).json(exercises)
})


const getExercisebyName = asyncHandler(async(req,res)=>{
    const {userId, name} = req.params
    
    // Search for exercises belonging to user and matching name
    const exercises = await Exercise.find({
        userId,
        name: { $regex: new RegExp(name, 'i') }
    });

    // Search stored exercises collection for matching name
    const storedExercises = await Stored_Exercises.find({
        name: { $regex: new RegExp(name, 'i') }
    });

    // Combine results from both collections
    const allExercises = [...exercises, ...storedExercises];

    if(allExercises.length === 0) {
        res.status(404)
        throw new Error('No exercises found for this user with that name')
    }
    
    res.status(200).json(allExercises)
})


module.exports={createExercise,getAllExercises,getExercisebyName,createStoredExercises}



