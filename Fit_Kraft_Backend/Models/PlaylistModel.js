const mongoose = require('mongoose')

// Define the schema for an individual Music Item.
// This will be used as a sub-document within the Playlist schema.
const MusicItemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Music title is required.'], // Makes title a required field
    trim: true // Removes whitespace from both ends of a string
  },
  artist: {
    type: String,
    required: [true, 'Artist name is required.'],
    trim: true
  },
  audioUrl: {
    type: String,
    required: [true, 'Audio URL is required.'],
    // Optional: You could add a custom validator for URL format if needed
    // match: [/^(ftp|http|https):\/\/[^ "]+$/, 'Please fill a valid URL']
  },
  duration: {
    type: Number, // Assuming duration is in milliseconds or seconds
    required: [true, 'Duration is required.'],
    min: [0, 'Duration cannot be negative.'] // Ensures duration is not negative
  },
  image: {
    type: String, // URL to an image for the music item
    trim: true,
    default: '' // Sets a default empty string if no image is provided
  },
  playlistName: { // As requested, though often redundant if part of a named playlist
    type: String,
    trim: true,
    default: ''
  }
}, {
  // Sub-documents don't get their own _id by default unless you want them to.
  // If you need each music item to have its own unique _id within the array:
  _id: true // Set to true if you want individual _id for each music item, false or omit if not.
           // Default is true for subdocuments in Mongoose 6+
});


// Define the schema for a Playlist.
const PlaylistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Playlist name is required.'],
    trim: true,
    unique: true // Optional: if you want playlist names to be unique
  },
  musicItems: {
    type: [MusicItemSchema], // An array of MusicItem documents
    default: [] // Defaults to an empty array if no music items are provided
  },
  // Optional: You might want to link playlists to a user
  // user: {
  //   type: mongoose.Schema.Types.ObjectId,
  //   ref: 'User', // Assuming you have a User model
  //   required: true
  // },
}, {
  // Automatically add createdAt and updatedAt timestamps
  timestamps: true
});

// Create the Mongoose model from the PlaylistSchema.
// The first argument is the singular name of the collection your model is for.
// Mongoose automatically looks for the plural, lowercased version.
// Thus, for 'Playlist', the model will be for the 'playlists' collection.
const Playlist = mongoose.model('Playlist', PlaylistSchema);

// Export the model for use in other parts of your application.
module.exports=Playlist