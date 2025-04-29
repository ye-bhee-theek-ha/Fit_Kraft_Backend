const express = require("express");
const ErrorHandler = require("./middleware/Errorhandler");
const app = express();
const dotenv = require("dotenv");
dotenv.config();

const dbConnection = require("./config/dbConnection");
dbConnection();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.listen(5000, () => {
    console.log("Server is running on port 5000");
});

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

app.get("/", (req, res) => {
    res.send("API is running...")
})

app.use("/user", require("./Routes/UserRoutes"));
app.use("/exercise", require("./Routes/ExerciseRoutes"));   
app.use("/workout", require("./Routes/WorkoutRoutes"));
app.use("/dietery", require("./Routes/DieteryRoutes"));
app.use("/mentalwellness",require('./Routes/MentallWellnessRoutes'))

app.use(ErrorHandler);








