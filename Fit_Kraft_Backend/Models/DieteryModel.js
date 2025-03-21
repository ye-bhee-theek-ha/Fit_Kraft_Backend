const mongoose = require('mongoose')
const Meal = require('./MealModel')


const DieterySchema = new mongoose.Schema({//this is the schema for the every day dietery plan  
    UserId:String,
    Date:Date,
    Meals:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Meal'
    }],
    TotalCalories:Number,
    TotalProtein:Number,
    TotalCarbs:Number,
    TotalFats:Number,

})

module.exports = mongoose.model('Dietery',DieterySchema)