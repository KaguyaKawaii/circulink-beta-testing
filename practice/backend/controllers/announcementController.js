import Announcement from '../models/Announcement.js';
import Log from '../models/Log.js';

const announcementController = {
  // Create new announcement
  async createAnnouncement(req, res) {
    try {
      const { title, message, endDate } = req.body;
      
      // For demo purposes, use a default user ID if not provided
      const createdBy = req.user?._id || '65d8f1a9e4b3c1a2b3c4d5e6'; // Default admin user ID
      
      const announcement = new Announcement({
        title,
        message,
        type: 'info', // Always set to info
        priority: 'medium', // Always set to medium
        endDate: endDate || null, // Make endDate optional
        targetAudience: 'all', // Always set to all users (excluding admins)
        createdBy: createdBy
      });

      await announcement.save();
      await announcement.populate('createdBy', 'name email');

      // Log the announcement creation
      await Log.create({
        userId: createdBy,
        action: 'CREATE_ANNOUNCEMENT',
        details: `Created announcement: ${title}`,
        id_number: 'N/A',
        userName: req.user?.name || 'Admin'
      });

      // Emit socket event for real-time updates
      const io = req.app.get('socketio');
      if (io) {
        io.emit('new-announcement', announcement);
      }

      res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        announcement
      });
    } catch (error) {
      console.error('Create announcement error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to create announcement',
        error: error.message
      });
    }
  },

  // Get all announcements
  async getAnnouncements(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const announcements = await Announcement.find()
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Announcement.countDocuments();

      res.json({
        success: true,
        announcements,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get announcements error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch announcements',
        error: error.message
      });
    }
  },

  // Get active announcements for current user - FIXED VERSION
  async getActiveAnnouncements(req, res) {
    try {
      const userId = req.query.userId; // Get userId from query params
      const userRole = (req.query.userRole || 'student').toLowerCase(); // Convert to lowercase

      console.log('Fetching active announcements for:', { userId, userRole });

      // Use the static method from the model
      const announcements = await Announcement.getActiveForUser(userId, userRole);

      console.log('Found announcements:', announcements.length);

      res.json({
        success: true,
        announcements
      });
    } catch (error) {
      console.error('Get active announcements error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active announcements',
        error: error.message
      });
    }
  },

  // Get announcement by ID
  async getAnnouncementById(req, res) {
    try {
      const announcement = await Announcement.findById(req.params.id)
        .populate('createdBy', 'name email');

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
      }

      res.json({
        success: true,
        announcement
      });
    } catch (error) {
      console.error('Get announcement error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch announcement',
        error: error.message
      });
    }
  },

  // Update announcement
  async updateAnnouncement(req, res) {
    try {
      const announcement = await Announcement.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      ).populate('createdBy', 'name email');

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
      }

      // Log the update
      await Log.create({
        userId: req.user?._id,
        action: 'UPDATE_ANNOUNCEMENT',
        details: `Updated announcement: ${announcement.title}`,
        id_number: 'N/A',
        userName: req.user?.name || 'Admin'
      });

      // Emit socket event for real-time updates
      const io = req.app.get('socketio');
      if (io) {
        io.emit('announcement-updated', announcement);
      }

      res.json({
        success: true,
        message: 'Announcement updated successfully',
        announcement
      });
    } catch (error) {
      console.error('Update announcement error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to update announcement',
        error: error.message
      });
    }
  },

  // Delete announcement
  async deleteAnnouncement(req, res) {
    try {
      const announcement = await Announcement.findByIdAndDelete(req.params.id);

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
      }

      // Log the deletion
      await Log.create({
        userId: req.user?._id,
        action: 'DELETE_ANNOUNCEMENT',
        details: `Deleted announcement: ${announcement.title}`,
        id_number: 'N/A',
        userName: req.user?.name || 'Admin'
      });

      // Emit socket event for real-time updates
      const io = req.app.get('socketio');
      if (io) {
        io.emit('announcement-deleted', announcement._id);
      }

      res.json({
        success: true,
        message: 'Announcement deleted successfully'
      });
    } catch (error) {
      console.error('Delete announcement error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to delete announcement',
        error: error.message
      });
    }
  },

  // Dismiss announcement for user
  async dismissAnnouncement(req, res) {
    try {
      const announcement = await Announcement.findById(req.params.id);
      const userId = req.body.userId; // Get userId from request body

      if (!announcement) {
        return res.status(404).json({
          success: false,
          message: 'Announcement not found'
        });
      }

      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'User ID is required to dismiss announcement'
        });
      }

      await announcement.dismissForUser(userId);

      res.json({
        success: true,
        message: 'Announcement dismissed'
      });
    } catch (error) {
      console.error('Dismiss announcement error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to dismiss announcement',
        error: error.message
      });
    }
  },

  // Get all announcements for management (with delete option)
  async getAllAnnouncementsForManagement(req, res) {
    try {
      const announcements = await Announcement.find()
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        announcements
      });
    } catch (error) {
      console.error('Get all announcements error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Failed to fetch announcements',
        error: error.message
      });
    }
  }
};

export default announcementController;