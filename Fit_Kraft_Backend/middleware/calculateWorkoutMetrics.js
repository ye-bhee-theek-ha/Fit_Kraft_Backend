const calculateWorkoutMetrics = (req, res, next) => {
    try {
        const { exercises } = req.body;

        if (!exercises || !Array.isArray(exercises)) {
            return res.status(400).json({
                message: "Exercises array is required and must be an array"
            });
        }

        // Calculate total duration in seconds first
        const totalSeconds = exercises.reduce((total, exercise) => {
            // Ensure all values are numbers and have defaults
            const sets = Number(exercise.sets) || 0;
            const reps = Number(exercise.reps) || 0;
            const duration = Number(exercise.duration) || 0;

            if (duration === 0 && sets > 0 && reps > 0) {
                // If duration not provided but sets and reps are available
                // Calculate based on sets and reps (30 seconds per set*reps)
                return total + (sets * reps * 30);
            } else if (duration > 0) {
                // If duration is provided in minutes, convert to seconds
                return total + (duration * 60);
            }
            return total;
        }, 0);

        // Ensure we have valid numbers
        const validTotalSeconds = Number(totalSeconds) || 0;

        // Convert total seconds to minutes and remaining seconds
        const minutes = Math.max(0, Math.floor(validTotalSeconds / 60));
        const seconds = Math.max(0, Math.round(validTotalSeconds % 60));

        // Add calculated duration to request body in the format matching the schema
        req.body.duration = {
            minutes: minutes,
            seconds: seconds
        };

        // Calculate calories burned using total duration in hours
        const totalHours = validTotalSeconds / 3600; // Convert seconds to hours
        const MET = 4; // Using a basic MET value of 4 (moderate intensity) as default
        const userWeight = Number(req.body.weight) || 70; // default weight if not provided

        // Ensure calories burned is a valid number
        const caloriesBurned = Math.max(0, Math.round(MET * userWeight * totalHours));
        req.body.caloriesBurned = caloriesBurned;

        // Log the calculations for debugging
        console.log('Workout Metrics Calculation:', {
            totalSeconds: validTotalSeconds,
            duration: req.body.duration,
            weight: userWeight,
            caloriesBurned: caloriesBurned
        });

        next();
    } catch (error) {
        console.error('Error in calculateWorkoutMetrics:', error);
        res.status(400).json({
            message: "Error calculating workout metrics",
            error: error.message,
            details: error.stack
        });
    }
};

module.exports = calculateWorkoutMetrics; 