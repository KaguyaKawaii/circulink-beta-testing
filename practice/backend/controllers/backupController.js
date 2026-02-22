const backupService = require('../services/backupService');
const Backup = require('../models/Backup');
const Log = require('../models/Log');

exports.createBackup = async (req, res) => {
  try {
    const userId = req.user?._id;
    const type = req.body.type || 'manual'; // manual or auto
    const result = await backupService.createBackup(userId, type);
    
    await Log.create({
      userId: userId,
      action: 'CREATE_BACKUP',
      details: `Created ${type} backup: ${result.name}`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.json({ 
      success: true, 
      message: `${type} backup created successfully`, 
      backup: result
    });
  } catch (error) {
    console.error('Backup creation error:', error);
    
    await Log.create({
      userId: req.user?._id,
      action: 'CREATE_BACKUP_ERROR',
      details: `Failed to create backup: ${error.message}`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.restoreBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    const options = req.body.options || {};
    
    console.log('🔄 Restore request for filename:', filename, 'Options:', options);

    const result = await backupService.restoreBackup(filename, options);
    
    await Log.create({
      userId: req.user?._id,
      action: 'RESTORE_BACKUP',
      details: `Restored backup: ${filename} - ${result.restoreResults.restoredCollections.length} collections restored`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.json({ 
      success: true, 
      message: 'Backup restored successfully',
      result: result
    });
  } catch (error) {
    console.error('❌ Restore backup error:', error);
    
    await Log.create({
      userId: req.user?._id,
      action: 'RESTORE_BACKUP_ERROR',
      details: `Failed to restore backup ${req.params.filename}: ${error.message}`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.listBackups = async (req, res) => {
  try {
    const backups = await backupService.getBackupList();
    res.json({ 
      success: true, 
      backups,
      total: backups.length
    });
  } catch (error) {
    console.error('Backup list error:', error);
    
    await Log.create({
      userId: req.user?._id,
      action: 'LIST_BACKUPS_ERROR',
      details: `Failed to list backups: ${error.message}`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.downloadBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    console.log('🔄 Download request for filename:', filename);

    const backup = await Backup.findOne({ filename: filename });
    if (!backup) {
      console.error('❌ Backup not found for filename:', filename);
      
      await Log.create({
        userId: req.user?._id,
        action: 'DOWNLOAD_BACKUP_NOT_FOUND',
        details: `Backup file not found: ${filename}`,
        id_number: req.user?.id_number,
        userName: req.user?.name
      });

      return res.status(404).json({ 
        success: false, 
        message: 'Backup file not found in database' 
      });
    }

    console.log('✅ Found backup:', backup.name, 'filename:', backup.filename);

    const filePath = await backupService.getBackupPath(backup.filename);
    
    console.log('📁 File path:', filePath);
    
    await Log.create({
      userId: req.user?._id,
      action: 'DOWNLOAD_BACKUP',
      details: `Downloaded backup: ${backup.name} (${backup.filename})`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    
    res.download(filePath, backup.filename, (err) => {
      if (err) {
        console.error('❌ Download error:', err);
        
        Log.create({
          userId: req.user?._id,
          action: 'DOWNLOAD_BACKUP_ERROR',
          details: `Failed to download backup ${backup.filename}: ${err.message}`,
          id_number: req.user?.id_number,
          userName: req.user?.name
        });

        if (!res.headersSent) {
          res.status(500).json({ 
            success: false, 
            message: 'Failed to download backup file' 
          });
        }
      } else {
        console.log('✅ Download completed successfully');
      }
    });
  } catch (error) {
    console.error('❌ Download backup error:', error);
    
    await Log.create({
      userId: req.user?._id,
      action: 'DOWNLOAD_BACKUP_ERROR',
      details: `Failed to download backup: ${error.message}`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.deleteBackup = async (req, res) => {
  try {
    const { filename } = req.params;
    console.log('🔄 Delete request for filename:', filename);

    // URL decode the filename
    const decodedFilename = decodeURIComponent(filename);
    console.log('📁 Decoded filename:', decodedFilename);

    // Find backup by filename
    const backup = await Backup.findOne({ filename: decodedFilename });
    if (!backup) {
      console.error('❌ Backup not found for filename:', decodedFilename);
      
      await Log.create({
        userId: req.user?._id,
        action: 'DELETE_BACKUP_NOT_FOUND',
        details: `Backup not found for deletion: ${decodedFilename}`,
        id_number: req.user?.id_number,
        userName: req.user?.name
      });

      return res.status(404).json({ 
        success: false, 
        message: 'Backup not found' 
      });
    }

    console.log('✅ Found backup:', backup.name);

    // Delete the backup
    await backupService.deleteBackup(backup.name);
    
    await Log.create({
      userId: req.user?._id,
      action: 'DELETE_BACKUP',
      details: `Deleted backup: ${backup.name} (${backup.filename})`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.json({ 
      success: true, 
      message: 'Backup deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete backup error:', error);
    
    await Log.create({
      userId: req.user?._id,
      action: 'DELETE_BACKUP_ERROR',
      details: `Failed to delete backup: ${error.message}`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.status(500).json({ 
      success: false, 
      message: error.message || 'Failed to delete backup'
    });
  }
};

exports.getBackupInfo = async (req, res) => {
  try {
    const { filename } = req.params;
    
    const backup = await Backup.findOne({ filename: filename });
    if (!backup) {
      return res.status(404).json({ 
        success: false, 
        message: 'Backup not found' 
      });
    }

    res.json({ 
      success: true, 
      backup: {
        name: backup.name,
        filename: backup.filename,
        size: backup.size,
        createdAt: backup.createdAt,
        type: backup.type,
        statistics: backup.data?.statistics,
        totalCollections: backup.data?.totalCollections,
        backupType: backup.type?.includes('auto') ? 'Automatic' : 'Manual'
      }
    });
  } catch (error) {
    console.error('Get backup info error:', error);
    
    await Log.create({
      userId: req.user?._id,
      action: 'GET_BACKUP_INFO_ERROR',
      details: `Failed to get backup info for ${req.params.filename}: ${error.message}`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

exports.testBackup = async (req, res) => {
  try {
    const backupCount = await Backup.countDocuments();
    
    await Log.create({
      userId: req.user?._id,
      action: 'TEST_BACKUP_SYSTEM',
      details: 'Tested backup system functionality',
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.json({ 
      success: true, 
      message: 'Backup system is working!',
      storage: 'Backups are stored in MongoDB database AND local ZIP files',
      totalBackups: backupCount,
      autoBackupEnabled: true,
      backupFrequency: 'Configurable in System Settings',
      endpoints: {
        list: 'GET /admin/system/backups',
        create: 'POST /admin/system/backup',
        restore: 'POST /admin/system/backup/restore/:filename',
        download: 'GET /admin/system/backup/download/:filename',
        delete: 'DELETE /admin/system/backup/:filename',
        info: 'GET /admin/system/backup/info/:filename'
      }
    });
  } catch (error) {
    await Log.create({
      userId: req.user?._id,
      action: 'TEST_BACKUP_SYSTEM_ERROR',
      details: `Backup system test failed: ${error.message}`,
      id_number: req.user?.id_number,
      userName: req.user?.name
    });

    res.status(500).json({
      success: false,
      message: 'Backup system error: ' + error.message
    });
  }
};