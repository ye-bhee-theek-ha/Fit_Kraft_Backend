const mongoose=require('mongoose')

const Stored_ExercisesSchema=new mongoose.Schema({
    name:String,
    description:String,
    gifUrl:String,
    bodyPart:String,
    equipment:String,
    User_Created_ID:String
})

const Stored_Exercises=mongoose.model('Stored_Exercises',Stored_ExercisesSchema)

module.exports=Stored_Exercises

