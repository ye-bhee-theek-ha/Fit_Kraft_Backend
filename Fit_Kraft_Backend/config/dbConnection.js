const mongoose = require("mongoose");

const dbConnection = async () => {
    try {
        await mongoose.connect(process.env.Connetion_string);
        console.log("Connected to MongoDB");
    } catch (error) {
        console.log(error);
    }
};

module.exports = dbConnection;