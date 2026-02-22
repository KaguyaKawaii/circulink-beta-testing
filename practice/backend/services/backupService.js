const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const archiver = require('archiver');
const unzipper = require('unzipper');
const Backup = require('../models/Backup');
const cron = require('node-cron');

class BackupService {
  constructor() {
    this.backupDir = path.join(__dirname, '../../backups');
    this.ensureBackupDir();
    this.initAutoBackup();
    this.systemSettingModel = null;
  }

  ensureBackupDir() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      console.log('✅ Backup directory created:', this.backupDir);
    }
  }

  // Helper method to get SystemSetting model safely
  async getSystemSettingModel() {
    try {
      // Try to get the model if it's already registered
      if (mongoose.models.SystemSetting) {
        return mongoose.model('SystemSetting');
      }
      
      // If not registered, try to require it dynamically
      try {
        const SystemSetting = require('../models/SystemSetting');
        this.systemSettingModel = SystemSetting;
        return SystemSetting;
      } catch (error) {
        console.warn('⚠️ SystemSetting model not available yet');
        return null;
      }
    } catch (error) {
      console.warn('⚠️ Could not get SystemSetting model:', error.message);
      return null;
    }
  }

  initAutoBackup() {
    // Check every minute for scheduled backups
    cron.schedule('* * * * *', async () => {
      try {
        await this.checkAndRunAutoBackup();
      } catch (error) {
        // Silently fail - auto-backup will try again next minute
      }
    });
    console.log('🔄 Auto-backup scheduler initialized');
  }

  async checkAndRunAutoBackup() {
    try {
      // Get system settings model safely
      const SystemSetting = await this.getSystemSettingModel();
      
      if (!SystemSetting) {
        // Model not available yet, skip this check
        return;
      }

      const settings = await SystemSetting.findOne({});
      
      if (!settings || !settings.autoBackup) {
        return; // Auto backup disabled
      }

      const lastBackup = await Backup.findOne({ 
        type: 'auto_system_zip' 
      }).sort({ createdAt: -1 });

      const now = new Date();
      let shouldRun = false;

      if (!lastBackup) {
        shouldRun = true;
      } else {
        const hoursSinceLastBackup = (now - lastBackup.createdAt) / (1000 * 60 * 60);
        
        switch (settings.backupFrequency) {
          case 'hourly':
            shouldRun = hoursSinceLastBackup >= 1;
            break;
          case 'daily':
            shouldRun = hoursSinceLastBackup >= 24;
            break;
          case 'weekly':
            shouldRun = hoursSinceLastBackup >= 168; // 7 days
            break;
          case 'monthly':
            shouldRun = hoursSinceLastBackup >= 720; // 30 days
            break;
          default:
            shouldRun = false;
        }
      }

      if (shouldRun) {
        console.log('🔄 Running scheduled auto-backup...');
        await this.createBackup(null, 'auto');
      }
    } catch (error) {
      // Log but don't throw - auto-backup should continue trying
      console.error('❌ Auto-backup check failed:', error.message);
    }
  }

  async createBackup(userId = null, type = 'manual') {
    let output = null;
    let archive = null;
    let filePath = null;
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupType = type === 'auto' ? 'auto' : 'manual';
      const backupName = `system-backup-${backupType}-${timestamp}`;
      const fileName = `${backupName}.zip`;
      filePath = path.join(this.backupDir, fileName);

      console.log(`🔄 Starting ${type} ZIP backup creation...`);
      console.log(`📁 Backup file path: ${filePath}`);
      
      // Create ZIP archive
      output = fs.createWriteStream(filePath);
      archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
      });

      // Pipe archive data to the file
      archive.pipe(output);

      // Create organized backup structure FIRST (before finalizing)
      console.log('🔄 Creating organized backup structure...');
      await this.createOrganizedBackup(archive);
      
      console.log('✅ Organized backup structure created, finalizing...');
      
      // Finalize the archive
      await archive.finalize();

      // Now wait for the output to finish writing
      return new Promise((resolve, reject) => {
        output.on('close', async () => {
          const size = archive.pointer();
          console.log('✅ ZIP backup created:', size + ' total bytes');
          
          if (size === 0) {
            console.error('❌ Backup file is empty!');
            reject(new Error('Backup file is empty'));
            return;
          }
          
          try {
            const fileStats = fs.statSync(filePath);
            const fileSize = this.formatFileSize(fileStats.size);

            // Save backup info to MongoDB
            const backupData = await this.collectBackupData();
            
            const backup = new Backup({
              name: backupName,
              filename: fileName,
              data: {
                timestamp: new Date().toISOString(),
                system: 'Room Reservation System - Full Backup',
                version: '1.0.0',
                type: type,
                totalCollections: Object.keys(backupData.collections || {}).length,
                zipContents: await this.getZipContentsDescription(),
                fileType: 'zip',
                compression: 'high',
                statistics: backupData.statistics
              },
              size: fileSize,
              type: `${type}_system_zip`,
              createdBy: userId
            });

            await backup.save();

            console.log(`✅ ${type} backup saved to MongoDB:`, backupName);
            console.log(`📊 Backup file size: ${fileSize}`);
            
            // Clean up old auto backups if needed
            if (type === 'auto') {
              await this.cleanupOldAutoBackups();
            }
            
            resolve({ 
              fileName: backupName,
              filename: fileName,
              size: fileSize,
              id: backup._id,
              date: backup.createdAt,
              zipSize: size,
              fileType: 'zip',
              type: type
            });
          } catch (error) {
            console.error('❌ Error saving backup to MongoDB:', error);
            reject(error);
          }
        });

        archive.on('error', (err) => {
          console.error('❌ Archive error:', err);
          reject(err);
        });

        archive.on('warning', (err) => {
          if (err.code === 'ENOENT') {
            console.warn('Archive warning:', err);
          } else {
            console.error('Archive warning:', err);
          }
        });

        archive.on('progress', (progress) => {
          console.log(`📦 Archive progress: ${progress.fs.processedBytes} bytes processed`);
        });

        archive.on('entry', (entry) => {
          console.log(`📄 Added to archive: ${entry.name}`);
        });
      });
    } catch (error) {
      console.error('❌ Backup creation failed:', error);
      
      // Clean up if file was created but empty
      if (filePath && fs.existsSync(filePath)) {
        try {
          const stats = fs.statSync(filePath);
          if (stats.size === 0) {
            fs.unlinkSync(filePath);
            console.log('🗑️ Removed empty backup file');
          }
        } catch (e) {
          console.error('❌ Failed to remove empty backup file:', e);
        }
      }
      
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async createOrganizedBackup(archive) {
    try {
      console.log('🔄 Creating organized backup structure in ZIP...');

      // Add README file
      const readmeContent = this.createReadmeFile();
      archive.append(readmeContent, { name: 'README.txt' });
      console.log('✅ Added README.txt');

      // Get all collections
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      console.log(`📊 Found ${collections.length} collections to backup`);

      const collectionStats = {};
      let totalRecords = 0;
      let collectionsBackedUp = 0;

      // Backup each collection with organized structure
      for (const collectionInfo of collections) {
        const collectionName = collectionInfo.name;
        
        // Skip system collections
        if (collectionName.startsWith('system.') || collectionName === 'backups') {
          console.log(`⏭️  Skipping system collection: ${collectionName}`);
          continue;
        }

        console.log(`🔄 Backing up collection: ${collectionName}`);
        
        try {
          const collection = mongoose.connection.db.collection(collectionName);
          const allData = await collection.find({}).toArray();
          
          console.log(`📦 Collection ${collectionName}: ${allData.length} records found`);
          
          if (allData.length > 0) {
            // Log sample of first record to verify data structure
            console.log(`📝 Sample record from ${collectionName}:`, 
              JSON.stringify(allData[0]).substring(0, 200) + '...');
          }
          
          // Create JSON file for the collection
          const collectionData = {
            collection: collectionName,
            count: allData.length,
            timestamp: new Date().toISOString(),
            data: allData
          };

          // Convert to JSON string
          const jsonString = JSON.stringify(collectionData, null, 2);
          console.log(`📄 JSON size for ${collectionName}: ${(jsonString.length / 1024).toFixed(2)} KB`);

          // Add to ZIP with organized path
          const collectionPath = `collections/${collectionName}.json`;
          archive.append(jsonString, { name: collectionPath });

          collectionStats[collectionName] = {
            count: allData.length
          };

          totalRecords += allData.length;
          collectionsBackedUp++;

          console.log(`✅ ${collectionName}: ${allData.length} records backed up`);
        } catch (error) {
          console.error(`❌ Error backing up ${collectionName}:`, error.message);
          collectionStats[collectionName] = {
            error: error.message
          };
        }
      }

      // Add metadata file
      const metadata = {
        timestamp: new Date().toISOString(),
        system: 'Room Reservation System',
        version: '1.0.0',
        database: mongoose.connection.name,
        format: 'ZIP',
        collections: collectionStats,
        totalCollections: collectionsBackedUp,
        totalRecords: totalRecords,
        skippedCollections: collections.length - collectionsBackedUp
      };

      console.log(`📊 Metadata: ${metadata.totalCollections} collections backed up, ${metadata.totalRecords} total records`);
      
      const metadataJson = JSON.stringify(metadata, null, 2);
      console.log(`📄 Metadata JSON size: ${(metadataJson.length / 1024).toFixed(2)} KB`);
      archive.append(metadataJson, { name: 'backup-metadata.json' });

      // Add database stats
      const dbStats = await this.getDatabaseStats();
      const dbStatsJson = JSON.stringify(dbStats, null, 2);
      console.log(`📄 Database stats JSON size: ${(dbStatsJson.length / 1024).toFixed(2)} KB`);
      archive.append(dbStatsJson, { name: 'database-stats.json' });

      console.log('✅ Organized backup structure created in ZIP');
    } catch (error) {
      console.error('❌ Error creating organized backup:', error);
      throw error;
    }
  }

  async restoreBackup(filename, options = {}) {
    try {
      console.log('🔄 Starting restore process for:', filename);
      
      // Security check
      if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        throw new Error('Invalid filename');
      }

      const filePath = path.join(this.backupDir, filename);
      
      if (!fs.existsSync(filePath)) {
        throw new Error('Backup file not found: ' + filename);
      }

      // Find backup in database
      const backup = await Backup.findOne({ filename: filename });
      if (!backup) {
        throw new Error('Backup record not found in database');
      }

      // Check if backup file has content
      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      // Create restore point before proceeding
      console.log('🔄 Creating pre-restore backup...');
      const preRestoreBackup = await this.createBackup(null, 'pre_restore');

      // Extract and restore
      console.log('🔄 Extracting and restoring backup...');
      const restoreResults = await this.extractAndRestore(filePath, options);

      console.log('✅ Restore completed successfully');
      
      return {
        success: true,
        preRestoreBackup: preRestoreBackup,
        restoreResults: restoreResults,
        message: `Successfully restored ${restoreResults.restoredCollections.length} collections with ${restoreResults.totalRecordsRestored} records`
      };
    } catch (error) {
      console.error('❌ Restore failed:', error);
      throw new Error(`Failed to restore backup: ${error.message}`);
    }
  }

  async extractAndRestore(filePath, options) {
    const restoreResults = {
      restoredCollections: [],
      failedCollections: [],
      totalRecordsRestored: 0,
      timestamp: new Date()
    };

    // Create extraction directory
    const extractDir = path.join(this.backupDir, 'temp_restore_' + Date.now());
    fs.mkdirSync(extractDir, { recursive: true });

    try {
      console.log('📂 Extracting to:', extractDir);
      
      // Extract ZIP file
      await fs.createReadStream(filePath)
        .pipe(unzipper.Extract({ path: extractDir }))
        .promise();

      console.log('✅ Extraction completed');

      // Read metadata
      const metadataPath = path.join(extractDir, 'backup-metadata.json');
      if (fs.existsSync(metadataPath)) {
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        restoreResults.backupMetadata = metadata;
        console.log('📊 Backup metadata:', metadata);
      }

      // Restore collections
      const collectionsDir = path.join(extractDir, 'collections');
      if (fs.existsSync(collectionsDir)) {
        const collectionFiles = fs.readdirSync(collectionsDir)
          .filter(file => file.endsWith('.json'));

        console.log(`📦 Found ${collectionFiles.length} collection files to restore`);

        for (const file of collectionFiles) {
          try {
            const collectionName = file.replace('.json', '');
            
            // Skip if collection is in exclude list
            if (options.excludeCollections && options.excludeCollections.includes(collectionName)) {
              console.log(`⏭️  Skipping excluded collection: ${collectionName}`);
              continue;
            }

            console.log(`🔄 Restoring collection: ${collectionName}`);
            
            const collectionFilePath = path.join(collectionsDir, file);
            const fileContent = fs.readFileSync(collectionFilePath, 'utf8');
            console.log(`📄 ${file} size: ${(fileContent.length / 1024).toFixed(2)} KB`);
            
            const collectionData = JSON.parse(fileContent);
            console.log(`📊 ${collectionName} has ${collectionData.data?.length || 0} records to restore`);
            
            const collection = mongoose.connection.db.collection(collectionName);
            
            if (options.clearExisting) {
              const deleteResult = await collection.deleteMany({});
              console.log(`🗑️  Cleared ${deleteResult.deletedCount} existing records from ${collectionName}`);
            }

            if (collectionData.data && Array.isArray(collectionData.data)) {
              if (collectionData.data.length > 0) {
                // Drop collection if requested
                if (options.dropExisting) {
                  await collection.drop().catch(() => {});
                  console.log(`🗑️  Dropped collection: ${collectionName}`);
                }
                
                // Insert data in batches to avoid memory issues
                const batchSize = 1000;
                let insertedCount = 0;
                
                for (let i = 0; i < collectionData.data.length; i += batchSize) {
                  const batch = collectionData.data.slice(i, i + batchSize);
                  const result = await collection.insertMany(batch, { 
                    ordered: options.ordered || false 
                  });
                  insertedCount += result.length;
                  console.log(`📥 Inserted batch ${Math.floor(i/batchSize) + 1}: ${result.length} records`);
                }
                
                restoreResults.restoredCollections.push({
                  name: collectionName,
                  count: insertedCount,
                  total: collectionData.data.length
                });
                restoreResults.totalRecordsRestored += insertedCount;
                
                console.log(`✅ Restored ${insertedCount} records to ${collectionName}`);
              } else {
                console.log(`⚠️  No data to restore for ${collectionName}`);
              }
            }
          } catch (error) {
            console.error(`❌ Failed to restore ${file}:`, error.message);
            restoreResults.failedCollections.push({
              collection: file,
              error: error.message
            });
          }
        }
      }

      // Clean up temp directory
      console.log('🧹 Cleaning up temp directory...');
      fs.rmSync(extractDir, { recursive: true, force: true });

      return restoreResults;
    } catch (error) {
      console.error('❌ Extract and restore error:', error);
      
      // Clean up temp directory on error
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
      throw error;
    }
  }

  async cleanupOldAutoBackups() {
    try {
      const SystemSetting = await this.getSystemSettingModel();
      
      if (!SystemSetting) {
        return; // Model not available
      }

      const settings = await SystemSetting.findOne({});
      
      if (!settings || !settings.autoBackupRetention) {
        return; // Use default retention
      }

      const retentionDays = settings.autoBackupRetention || 30;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      console.log(`🧹 Cleaning up auto backups older than ${retentionDays} days`);

      // Find old auto backups
      const oldBackups = await Backup.find({
        type: 'auto_system_zip',
        createdAt: { $lt: cutoffDate }
      });

      console.log(`Found ${oldBackups.length} old backups to clean up`);

      for (const backup of oldBackups) {
        try {
          await this.deleteBackup(backup.name);
          console.log(`🧹 Cleaned up old auto backup: ${backup.name}`);
        } catch (error) {
          console.error(`❌ Failed to cleanup backup ${backup.name}:`, error.message);
        }
      }
    } catch (error) {
      console.error('❌ Auto backup cleanup failed:', error.message);
    }
  }

  async collectBackupData() {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const backupData = {
      timestamp: new Date().toISOString(),
      collections: {},
      statistics: {
        totalCollections: 0,
        totalRecords: 0,
        collectionsWithData: 0
      }
    };

    for (const coll of collections) {
      if (coll.name.startsWith('system.')) continue;
      const count = await this.getCollectionCount(coll.name);
      backupData.collections[coll.name] = { count };
      backupData.statistics.totalCollections++;
      backupData.statistics.totalRecords += count;
      if (count > 0) backupData.statistics.collectionsWithData++;
    }

    console.log('📊 Collected backup data:', backupData.statistics);
    return backupData;
  }

  async getCollectionCount(collectionName) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      return await collection.countDocuments();
    } catch (error) {
      console.error(`Error counting collection ${collectionName}:`, error.message);
      return 0;
    }
  }

  async getDatabaseStats() {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const stats = {
      timestamp: new Date().toISOString(),
      database: mongoose.connection.name,
      collections: []
    };

    for (const coll of collections) {
      if (coll.name.startsWith('system.')) continue;
      
      try {
        const collection = mongoose.connection.db.collection(coll.name);
        const count = await collection.countDocuments();
        
        stats.collections.push({
          name: coll.name,
          count: count,
          status: 'backed_up'
        });
      } catch (error) {
        console.error(`Error getting stats for ${coll.name}:`, error.message);
        stats.collections.push({
          name: coll.name,
          error: error.message,
          status: 'failed'
        });
      }
    }

    return stats;
  }

  async getZipContentsDescription() {
    const collections = await this.getCollectionList();
    return {
      format: "ZIP Archive",
      compression: "High (Level 9)",
      contents: [
        "README.txt - Backup information and instructions",
        "backup-metadata.json - Backup metadata and collection list",
        "database-stats.json - Database statistics",
        "collections/ - Complete collections as JSON files"
      ],
      totalCollections: collections.length
    };
  }

  async getCollectionList() {
    const collections = await mongoose.connection.db.listCollections().toArray();
    return collections.filter(coll => !coll.name.startsWith('system.'));
  }

  createReadmeFile() {
    return `Room Reservation System Backup
===============================

Backup created: ${new Date().toISOString()}
Format: ZIP Archive
Compression: High

CONTENTS:
---------
/README.txt           - This file
/backup-metadata.json - Backup information and collection list
/database-stats.json  - Database statistics
/collections/         - Complete collections as JSON files

RESTORATION INSTRUCTIONS:
------------------------
1. Go to System Settings > Backup Files
2. Click "Restore" next to the desired backup
3. Choose restore options:
   - Clear existing data before restore
   - Drop and recreate collections
   - Exclude specific collections
4. Confirm the restore operation

WARNING: Restoring will overwrite existing data!

NOTES:
------
- This is a complete database backup
- All timestamps are in ISO format
- Collections are stored as complete JSON files
- This backup contains all non-system collections
`;
  }

  async getBackupList() {
    try {
      const backups = await Backup.find()
        .sort({ createdAt: -1 })
        .select('name filename size createdAt type data')
        .populate('createdBy', 'name email')
        .lean();

      return backups.map(backup => ({
        name: backup.name,
        filename: backup.filename,
        size: backup.size,
        date: backup.createdAt,
        type: backup.type,
        id: backup._id,
        createdBy: backup.createdBy ? backup.createdBy.name : 'System',
        isZip: backup.filename.endsWith('.zip'),
        totalCollections: backup.data?.totalCollections || 0,
        format: 'ZIP',
        fileType: backup.data?.fileType || 'zip',
        backupType: backup.type?.includes('auto') ? 'Automatic' : 'Manual'
      }));
    } catch (error) {
      console.error('Error listing backups from MongoDB:', error);
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  async getBackupData(backupName) {
    try {
      const backup = await Backup.findOne({ name: backupName });
      if (!backup) {
        throw new Error('Backup not found in database');
      }
      return backup;
    } catch (error) {
      throw new Error(`Failed to get backup data: ${error.message}`);
    }
  }

  getBackupPath(filename) {
    // Security check
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new Error('Invalid filename');
    }
    
    const filePath = path.join(this.backupDir, filename);
    
    if (!fs.existsSync(filePath)) {
      throw new Error('Backup file not found: ' + filename);
    }
    
    return filePath;
  }

async deleteBackup(backupName) {
  try {
    console.log('🗑️ Attempting to delete backup:', backupName);
    
    // Find backup in database first
    const backup = await Backup.findOne({ name: backupName });
    if (!backup) {
      console.error('❌ Backup not found in database:', backupName);
      throw new Error('Backup not found in database');
    }

    console.log('✅ Found backup in DB:', backup.name, 'Filename:', backup.filename);

    // Delete local file
    const filePath = path.join(this.backupDir, backup.filename);
    console.log('📁 Looking for file at:', filePath);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted local file: ${backup.filename}`);
    } else {
      console.log('⚠️ Local file not found, continuing with DB deletion');
    }

    // Delete from MongoDB
    const result = await Backup.deleteOne({ name: backupName });
    console.log('✅ MongoDB deletion result:', result);

    console.log('✅ Backup deleted successfully:', backupName);
    return true;
  } catch (error) {
    console.error('❌ Error in deleteBackup:', error);
    throw new Error(`Failed to delete backup: ${error.message}`);
  }
}

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new BackupService();