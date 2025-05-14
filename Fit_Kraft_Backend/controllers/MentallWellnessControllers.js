
const asyncHandler=require('express-async-handler')
const MentalWellness=require('../Models/MentalWellnessModel')
const Playlist = require('../Models/PlaylistModel')


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



const createPlaylist = async (req, res) => {
    try {
      // Destructure name and musicItems from the request body
      const { name, musicItems } = req.body;
  
      // --- Basic Validation ---
      // Check if the playlist name is provided
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ message: 'Playlist name is required and must be a non-empty string.' });
      }
  
      // musicItems is optional on creation, or can be an empty array.
      // If musicItems are provided, ensure it's an array.
      if (musicItems && !Array.isArray(musicItems)) {
        return res.status(400).json({ message: 'If provided, musicItems must be an array.' });
      }
  
      // Optional: Further validation for each music item if provided
      if (musicItems && musicItems.length > 0) {
        for (const item of musicItems) {
          if (!item.title || !item.artist || !item.audioUrl || item.duration === undefined) {
            return res.status(400).json({
              message: 'Each music item must include title, artist, audioUrl, and duration.'
            });
          }
          if (typeof item.duration !== 'number' || item.duration < 0) {
              return res.status(400).json({ message: 'Music item duration must be a non-negative number.' });
          }
        }
      }
  
      // Create a new playlist instance
      // The 'musicItems' array will be validated by the MusicItemSchema if items are present.
      const newPlaylist = new Playlist({
        name: name.trim(),
        musicItems: musicItems || [], // Default to empty array if not provided
        // If you have a user associated with playlists:
        // user: req.user.id, // Assuming req.user.id contains the logged-in user's ID
      });
  
      // Save the new playlist to the database
      const savedPlaylist = await newPlaylist.save();
  
      // Send a 201 Created response with the newly created playlist
      res.status(201).json(savedPlaylist);
  
    } catch (error) {
      // Log the error for debugging
      console.error('Error creating playlist:', error);
  
      // Handle Mongoose validation errors (e.g., unique name constraint if playlist name already exists)
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: error.errors });
      }
      // Handle duplicate key error for unique playlist name
      if (error.code === 11000 && error.keyPattern && error.keyPattern.name) {
          return res.status(409).json({ message: `Playlist name '${error.keyValue.name}' already exists.` });
      }
  
  
      // Send a generic server error message
      res.status(500).json({ message: 'Server error. Could not create playlist.' });
    }
  };



  const getPlaylistByName = async (req, res) => {
    try {
      // Extract playlist name from request parameters
      // URL encoding (e.g., for names with spaces like "My%20Awesome%20Mix") is handled by Express
      const playlistName = req.params.name;
  
      if (!playlistName || typeof playlistName !== 'string' || playlistName.trim() === '') {
          return res.status(400).json({ message: 'Playlist name parameter is required.' });
      }
  
      // Find the playlist by its name
      // Using findOne as playlist names are ideally unique (or you might get the first match)
      const playlist = await Playlist.findOne({ name: playlistName.trim() });
      // If you want to populate user details (if you have a user field in PlaylistSchema):
      // const playlist = await Playlist.findOne({ name: playlistName.trim() }).populate('user', 'name email');
  
  
      // If no playlist is found with that name
      if (!playlist) {
        return res.status(404).json({ message: `Playlist with name '${playlistName}' not found.` });
      }
  
      // Send the playlist back in the response
      res.status(200).json(playlist);
  
    } catch (error) {
      // Log the error for debugging purposes
      console.error('Error fetching playlist by name:', error);
  
      // Send a generic error message to the client
      res.status(500).json({ message: 'Server error. Could not retrieve playlist.' });
    }
  };


  const createMentalWellnessItem = async (req, res) => {
    try {
      // Destructure all possible fields from the request body
      const {
        title,
        description,
        type,
        category,
        imageUrl,
        audioUrl,
        videoUrl
      } = req.body;
  
      // --- Optional Validations ---
      // Although the schema fields are optional, you might want to ensure
      // that at least some data is provided, or specific combinations.
      // For example, ensure at least a title or description is present.
      if (!title && !description && !audioUrl && !videoUrl && !imageUrl) {
        return res.status(400).json({ message: 'Cannot create an empty mental wellness item. Please provide some content.' });
      }
  
      // Validate 'type' if it's provided in the request body
      if (type && !wellnessTypes.includes(type)) {
        return res.status(400).json({
          message: `Invalid wellness type: '${type}'. Supported types are: ${wellnessTypes.join(', ')}.`
        });
      }
  
      // Construct the data object for the new item.
      // Only include fields that are actually provided in the request body
      // to avoid passing undefined values to the model, though Mongoose handles this.
      const itemData = {};
      if (title !== undefined) itemData.title = title;
      if (description !== undefined) itemData.description = description;
      if (type !== undefined) itemData.type = type;
      if (category !== undefined) itemData.category = category;
      if (imageUrl !== undefined) itemData.imageUrl = imageUrl;
      if (audioUrl !== undefined) itemData.audioUrl = audioUrl;
      if (videoUrl !== undefined) itemData.videoUrl = videoUrl;
  
      // Create a new MentalWellness instance
      const newItem = new MentalWellness(itemData);
  
      // Save the new item to the database
      const savedItem = await newItem.save();
  
      // Send a 201 Created response with the newly created item
      res.status(201).json(savedItem);
  
    } catch (error) {
      // Log the error for debugging purposes
      console.error('Error creating mental wellness item:', error);
  
      // Handle Mongoose validation errors (e.g., if 'type' is provided but not in enum)
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation Error', errors: error.errors });
      }
  
      // Send a generic server error message
      res.status(500).json({ message: 'Server error. Could not create mental wellness item.' });
    }
  };

module.exports = {
    getMusicWellnessItems,getYogaWellnessItems,getSleepWellnessItems,getRelaxingVideosItems,createPlaylist,getPlaylistByName,createMentalWellnessItem
};