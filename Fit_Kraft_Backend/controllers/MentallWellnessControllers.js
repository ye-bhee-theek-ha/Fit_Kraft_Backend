
const asyncHandler=require('express-async-handler')
const MentalWellness=require('../Models/MentalWellnessModel')



const getMusicWellnessItems = asyncHandler(async (req, res) => {

    // Define the fields you want to retrieve from the database
    // Using the field names from your schema ('imageUrl' instead of 'image')
    const fieldsToSelect = 'title description category imageUrl audioUrl';

    // Find documents in the MentalWellness collection that match:
    // 1. The 'type' field must be 'MUSIC'
    // 2. Select only the specified fields ('title', 'description', etc.)
    const musicItems = await MentalWellness.findAll({ type: 'MUSIC' })
                                          .select(fieldsToSelect);

    // Mongoose `find` returns an array. It will be empty if no documents match.
    // No need to explicitly check for 404 unless an empty array is considered an error state.

    // Send the response with the retrieved music items
    res.status(200).json({
        success: true,
        count: musicItems.length, // Optionally include the number of items found
        data: musicItems         // The array of music items (or an empty array if none found)
    });

});


const getYogaWellnessItems = asyncHandler(async (req, res) => {

    // Define the fields you want to retrieve from the database for Yoga items
    // Using 'title' from the schema, 'description', and 'imageUrl'
    const fieldsToSelect = 'title description imageUrl';

    // Find documents in the MentalWellness collection that match:
    // 1. The 'type' field must be 'YOGA'
    // 2. Select only the specified fields ('title', 'description', 'imageUrl')
    const yogaItems = await MentalWellness.find({ type: 'YOGA' })
                                          .select(fieldsToSelect);

    // Mongoose `find` returns an array. It will be empty if no documents match.
    // Send the response with the retrieved yoga items
    res.status(200).json({
        success: true,
        count: yogaItems.length, // Optionally include the number of items found
        data: yogaItems         // The array of yoga items (or an empty array if none found)
    });

})

const getSleepWellnessItems = asyncHandler(async (req, res) => {

    // Define the fields you want to retrieve for Sleep items
    // Using 'title' from schema instead of 'name', 'description', and 'videoUrl'
    const fieldsToSelect = 'title description videoUrl';

    // Find documents in the MentalWellness collection that match:
    // 1. The 'type' field must be 'SLEEP'
    // 2. Select only the specified fields ('title', 'description', 'videoUrl')
    const sleepItems = await MentalWellness.find({ type: 'SLEEP' })
                                           .select(fieldsToSelect);

    // Mongoose `find` returns an array. It will be empty if no documents match.
    // Send the response with the retrieved sleep items
    res.status(200).json({
        success: true,
        count: sleepItems.length, // Optionally include the number of items found
        data: sleepItems         // The array of sleep items (or an empty array if none found)
    });

})






const getRelaxingVideosItems = asyncHandler(async (req, res) => {

    // Define the fields you want to retrieve for Relaxing Video items
    // Assuming 'title', 'description', and 'videoUrl' are desired based on previous patterns
    const fieldsToSelect = 'title description videoUrl';

    // Find documents in the MentalWellness collection that match:
    // 1. The 'type' field must be 'RELAXING_VIDEOS'
    // 2. Select only the specified fields ('title', 'description', 'videoUrl')
    const relaxingVideosItems = await MentalWellness.find({ type: 'RELAXING_VIDEOS' })
                                                  .select(fieldsToSelect);

    // Mongoose `find` returns an array. It will be empty if no documents match.
    // Send the response with the retrieved relaxing video items
    res.status(200).json({
        success: true,
        count: relaxingVideosItems.length, // Optionally include the number of items found
        data: relaxingVideosItems         // The array of relaxing video items (or an empty array if none found)
    });

});

module.exports = {
    getMusicWellnessItems,getYogaWellnessItems,getSleepWellnessItems,getRelaxingVideosItems
};