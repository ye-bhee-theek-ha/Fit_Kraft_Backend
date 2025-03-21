const mongoose=require('mongoose')

const ExerciseSchema=new mongoose.Schema({//users exercises schema
    name:String,
    type:String,
    duration: {
        minutes: {
            type: Number,
            default: 0
        },
        seconds: {
            type: Number,
            default: 0
        }
    },
    sets:Number,
    reps:Number,
    weight:Number,
    completed:{
        type:Boolean,
        default:false
    }
    
})

const Exercise=mongoose.model('Exercise',ExerciseSchema)

module.exports=Exercise

