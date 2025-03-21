const mongoose = require('mongoose')


const MealSchema = new mongoose.Schema({
    Name:String,
    Calories:Number,
    Protein:Number,
    Carbs:Number,
    Fats:Number,
    Ingredients:Array,
    Instructions:String,
    Image:String,
    Category:String,//tells wheather it is a meal or a snack
    UserCreated_ID:{
        type: String,
        default: false
    },
    completed:{
        type:Boolean,
        default:false
    }


})


module.exports = mongoose.model('Meal',MealSchema)