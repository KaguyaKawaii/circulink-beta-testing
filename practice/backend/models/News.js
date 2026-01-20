const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  image: { type: String, default: null }, // For backward compatibility
  images: { type: [String], default: [] }, // NEW: Array for multiple images
  archived: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("News", newsSchema);