import express from 'express';
import SystemSettings from '../models/SystemSettings.js';

const router = express.Router();

// Get maintenance status (public route)
router.get('/maintenance-status', async (req, res) => {
  try {
    const settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      return res.json({
        success: true,
        maintenanceMode: false,
        maintenanceMessage: "",
        allowAdminAccess: true
      });
    }

    res.json({
      success: true,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      allowAdminAccess: settings.allowAdminAccess
    });
  } catch (error) {
    console.error('Error fetching maintenance status:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching maintenance status'
    });
  }
});

// Get system settings (admin only)
router.get('/admin/system/settings', async (req, res) => {
  try {
    const settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = new SystemSettings();
      await defaultSettings.save();
      return res.json({
        success: true,
        settings: defaultSettings
      });
    }

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching system settings'
    });
  }
});

// Update system settings (admin only)
router.put('/admin/system/settings', async (req, res) => {
  try {
    let settings = await SystemSettings.findOne().sort({ createdAt: -1 });
    
    if (!settings) {
      settings = new SystemSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }

    await settings.save();

    // Broadcast maintenance mode update to all connected clients
    const io = req.app.get('socketio');
    if (io) {
      io.emit('maintenance-mode-updated', {
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
        allowAdminAccess: settings.allowAdminAccess
      });
    }

    res.json({
      success: true,
      message: 'System settings updated successfully',
      settings
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating system settings'
    });
  }
});

export default router;