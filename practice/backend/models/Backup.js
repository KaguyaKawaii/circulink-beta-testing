// const mongoose = require('mongoose');

// const backupSchema = new mongoose.Schema({
//   name: {
//     type: String,
//     required: true,
//     unique: true
//   },
//   filename: {
//     type: String,
//     required: true
//   },
//   data: {
//     type: mongoose.Schema.Types.Mixed,
//     required: true
//   },
//   size: {
//     type: String,
//     required: true
//   },
//   type: {
//     type: String,
//     default: 'system'
//   },
//   createdBy: {
//     type: mongoose.Schema.Types.ObjectId,
//     ref: 'User'
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now
//   }
// });

// // Add index for better performance
// backupSchema.index({ createdAt: -1 });
// backupSchema.index({ type: 1 });

// module.exports = mongoose.model('Backup', backupSchema);