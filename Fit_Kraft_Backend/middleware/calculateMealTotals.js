const calculateMealTotals = (req, res, next) => {
    try {
        console.log('Middleware received body:', req.body);

        const { Meals } = req.body;  // Changed from meals to Meals to match your schema

        if (!Meals || !Array.isArray(Meals)) {
            return res.status(400).json({
                message: "Meals array is required and must be an array",
                receivedBody: req.body
            });
        }

        // Calculate totals from all meals
        const totals = Meals.reduce((acc, meal) => {
            return {
                calories: acc.calories + (meal.Calories || 0),  // Changed to match schema
                protein: acc.protein + (meal.Protein || 0),     // Changed to match schema
                carbs: acc.carbs + (meal.Carbs || 0),          // Changed to match schema
                fats: acc.fats + (meal.Fats || 0)              // Changed to match schema
            };
        }, { calories: 0, protein: 0, carbs: 0, fats: 0 });

        // Add calculated totals to request body
        req.body.TotalCalories = Math.round(totals.calories);
        req.body.TotalProtein = Math.round(totals.protein);
        req.body.TotalCarbs = Math.round(totals.carbs);
        req.body.TotalFats = Math.round(totals.fats);

        console.log('Calculated totals:', {
            TotalCalories: req.body.TotalCalories,
            TotalProtein: req.body.TotalProtein,
            TotalCarbs: req.body.TotalCarbs,
            TotalFats: req.body.TotalFats
        });

        next();
    } catch (error) {
        console.error('Error in calculateMealTotals:', error);
        res.status(400).json({
            message: "Error calculating meal totals",
            error: error.message,
            stack: error.stack
        });
    }
};

module.exports = calculateMealTotals; 