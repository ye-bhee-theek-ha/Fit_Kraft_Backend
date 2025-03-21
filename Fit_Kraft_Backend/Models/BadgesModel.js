const mongoose=require('mongoose')

const BadgesSchema=new mongoose.Schema({
    name:String,
    description:String,
    image:String,
    points:Number
})



const Badges=mongoose.model('Badges',BadgesSchema)

module.exports=Badges