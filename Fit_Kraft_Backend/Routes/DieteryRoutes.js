const express = require("express");
const router = express.Router();
const {createDietery,getDietary,getMeals,updateDieteryMeals,createMeal,updateDieteryMealStatus,updateMealInDietaryPlan} = require('../controllers/DieteryController')
const calculateMealTotals = require('../middleware/calculateMealTotals');

// Add body parsing middleware if needed
router.use(express.json());

router.post("/create", calculateMealTotals, createDietery);
router.get("/get/:id/", getDietary);
router.get("/getMeals/:name/:userId", getMeals);
router.put("/update/:userid", calculateMealTotals, updateDieteryMeals);
router.post("/createMeal", createMeal);
router.put('/update/:userid/dietery/:dieteryid/meal/:mealid',updateMealInDietaryPlan)
router.put('/updatestatus/dietery/:dieteryid/meal/:mealid',updateDieteryMealStatus)



module.exports = router;



