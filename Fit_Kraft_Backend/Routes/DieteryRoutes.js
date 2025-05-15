const express = require("express");
const router = express.Router();
const {createDietery,getDietary,getMeals,updateDieteryMeals,createMeal,updateDieteryMealStatus,updateMealInDietaryPlan,UpdateDietery} = require('../controllers/DieteryController')
const calculateMealTotals = require('../middleware/calculateMealTotals');

// Add body parsing middleware if needed
router.use(express.json());

router.post("/create", calculateMealTotals, createDietery);
router.get("/get/:id/", getDietary);
router.get("/getMeals/:name/:userId", getMeals);
router.put("/update", calculateMealTotals, updateDieteryMeals);//This adds meal to exsisting meal array
router.post("/createMeal", createMeal);
router.put('/update/meal/:mealId',updateMealInDietaryPlan)//changes meals ewvery attribute
router.put('/updatestatus/dietery/:dieteryid/meal/:mealid',updateDieteryMealStatus)//to update meals status
router.put('/updatedietery/dietery/:dieteryId/',UpdateDietery)//for updating dietery after generating from Meal plan generator


module.exports = router;



