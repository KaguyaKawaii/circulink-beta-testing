import mongoose from 'mongoose';

const announcementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  message: {
    type: String,
    required: [true, 'Announcement message is required'],
    trim: true,
    maxlength: [1000, 'Message cannot exceed 1000 characters']
  },
  type: {
    type: String,
    enum: ['info', 'warning', 'urgent', 'maintenance'],
    default: 'info'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  targetAudience: {
    type: String,
    enum: ['all', 'students', 'faculty', 'staff', 'admins'],
    default: 'all'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  dismissedBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    dismissedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

// Index for efficient queries
announcementSchema.index({ isActive: 1, endDate: 1 });
announcementSchema.index({ targetAudience: 1 });
announcementSchema.index({ 'dismissedBy.user': 1 });

// Static method to get active announcements for a user - CASE INSENSITIVE VERSION
announcementSchema.statics.getActiveForUser = function(userId, userRole) {
  // Convert user role to lowercase to match enum values
  const normalizedUserRole = (userRole || 'student').toLowerCase();
  
  const query = {
    isActive: true,
    $or: [
      { targetAudience: 'all' },
      { targetAudience: normalizedUserRole }
    ]
  };

  // Date filtering - announcements without endDate OR endDate in future
  query.$and = [
    {
      $or: [
        { endDate: null },
        { endDate: { $gt: new Date() } }
      ]
    }
  ];

  // If user ID is provided, exclude dismissed announcements
  if (userId) {
    query['dismissedBy.user'] = { $ne: userId };
  }

  console.log('MongoDB Query:', JSON.stringify(query, null, 2));
  
  return this.find(query)
    .sort({ priority: -1, createdAt: -1 })
    .populate('createdBy', 'name email');
};

// Method to check if announcement is dismissed by user
announcementSchema.methods.isDismissedByUser = function(userId) {
  return this.dismissedBy.some(dismissal => 
    dismissal.user && dismissal.user.toString() === userId.toString()
  );
};

// Method to dismiss announcement for user
announcementSchema.methods.dismissForUser = function(userId) {
  if (!this.isDismissedByUser(userId)) {
    this.dismissedBy.push({ user: userId });
  }
  return this.save();
};

const Announcement = mongoose.model('Announcement', announcementSchema);
export default Announcement;