const express = require("express");
const router = express.Router();
const {createDietery,getDietary,getMeals,updateDieteryMeals,createMeal} = require('../controllers/DieteryController')
const calculateMealTotals = require('../middleware/calculateMealTotals');

// Add body parsing middleware if needed
router.use(express.json());

router.post("/create", calculateMealTotals, createDietery);
router.get("/get/:id/", getDietary);
router.get("/getMeals/:name/:userId", getMeals);//for search bar
router.put("/update/:id", calculateMealTotals, updateDieteryMeals);
router.post("/createMeal", createMeal);



module.exports = router;

