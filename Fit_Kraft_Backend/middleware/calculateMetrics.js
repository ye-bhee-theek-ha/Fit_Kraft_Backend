const calculateMetrics = (req, res, next) => {
    try {
        const { weight, height, age, gender, activityLevel } = req.body;
        
        // Validate inputs to prevent division by zero
        if (!weight || weight <= 0 || !height || height <= 0) {
            return res.status(400).json({
                message: "Invalid weight or height values. Both must be greater than zero."
            });
        }
        
        // Convert height to meters if it's in cm
        const heightInMeters = height > 3 ? height / 100 : height;
        
        // Calculate BMI
        const bmi = weight / (heightInMeters * heightInMeters);
        
        // Calculate BMR using Mifflin-St Jeor Equation
        let bmr;
        if (gender.toLowerCase() === 'male') {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5;
        } else {
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161;
        }
        
        // Adjust BMR based on activity level
        const activityMultipliers = {
            'sedentary': 1.2,
            'light': 1.375,
            'moderate': 1.55,
            'active': 1.725,
            'very active': 1.9,
            'advance': 1.9  // Added this to match your 'advance' activity level
        };
        
        const activityMultiplier = activityMultipliers[activityLevel.toLowerCase()] || 1.2;
        const adjustedBmr = bmr * activityMultiplier;
        
        // Add calculated values to request body
        req.body.bmi = parseFloat(bmi.toFixed(2));
        req.body.bmr = parseFloat(adjustedBmr.toFixed(2));
        
        next();
    } catch (error) {
        res.status(400).json({
            message: "Error calculating BMI and BMR",
            error: error.message
        });
    }
};

module.exports = calculateMetrics;