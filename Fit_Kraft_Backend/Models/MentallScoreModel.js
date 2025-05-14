const mongoose = require('mongoose')




const MentalScore_Schema = new mongoose.Schema({

    User: String,
    Score: Number,
    Previous_Score : Number


})


module.exports = mongoose.model('MentalScore',MentalScore_Schema)
