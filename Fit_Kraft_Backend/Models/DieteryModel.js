const mongoose = require('mongoose')
const Meal = require('./MealModel')


const DieterySchema = new mongoose.Schema({  
    UserId:String,
    Date:Date,
    Meals:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meal',
        isCompleted:{
            type:Boolean,
            default:false
        }
    }],
    Day: String,
    TotalCalories:Number,
    TotalProtein:Number,
    TotalCarbs:Number,
    TotalFats:Number,

    

})

module.exports = mongoose.model('Dietery',DieterySchema)