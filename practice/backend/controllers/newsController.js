import News from "../models/News.js";
import Log from "../models/Log.js";
import { uploadToCloudinary } from "../services/cloudinaryService.js";

// 🔍 Search news
export const searchNews = async (req, res) => {
  try {
    const regex = new RegExp(req.params.query, "i");
    const newsList = await News.find({
      $or: [{ title: regex }, { content: regex }],
    }).sort({ createdAt: -1 });

    res.json(newsList);
  } catch (err) {
    console.error("Error searching news:", err);
    res.status(500).json({ error: "Failed to search news." });
  }
};

// 📄 Get all active news
export const getAllNews = async (req, res) => {
  try {
    const newsList = await News.find({ archived: false }).sort({ createdAt: -1 });
    res.json(newsList);
  } catch (err) {
    console.error("Error fetching news:", err);
    res.status(500).json({ error: "Failed to fetch news." });
  }
};

// 📄 Get archived news
export const getArchivedNews = async (req, res) => {
  try {
    const archivedList = await News.find({ archived: true }).sort({ createdAt: -1 });
    res.json(archivedList);
  } catch (err) {
    console.error("Error fetching archived news:", err);
    res.status(500).json({ error: "Failed to fetch archived news." });
  }
};

// 🗄 Archive a news item
export const archiveNews = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true }
    );
    if (!news) {
      return res.status(404).json({ error: "News not found." });
    }

    // Log successful archiving
    await Log.create({
      userId: req.user?._id,
      action: 'ARCHIVE_NEWS',
      details: `Archived news: "${news.title}"`,
      id_number: 'N/A',
      userName: req.user?.name || 'Admin'
    });

    res.json(news);
  } catch (err) {
    console.error("Error archiving news:", err);
    res.status(500).json({ error: "Failed to archive news." });
  }
};

// ♻️ Restore a news item
export const restoreNews = async (req, res) => {
  try {
    const news = await News.findByIdAndUpdate(
      req.params.id,
      { archived: false },
      { new: true }
    );
    if (!news) {
      return res.status(404).json({ error: "News not found." });
    }

    // Log successful restoration
    await Log.create({
      userId: req.user?._id,
      action: 'RESTORE_NEWS',
      details: `Restored news: "${news.title}"`,
      id_number: 'N/A',
      userName: req.user?.name || 'Admin'
    });

    res.json(news);
  } catch (err) {
    console.error("Error restoring news:", err);
    res.status(500).json({ error: "Failed to restore news." });
  }
};

// 📄 Get single news item
export const getNewsById = async (req, res) => {
  try {
    const newsItem = await News.findById(req.params.id);
    if (!newsItem) {
      return res.status(404).json({ error: "News not found." });
    }

    res.json(newsItem);
  } catch (err) {
    console.error("Error fetching news item:", err);
    res.status(500).json({ error: "Failed to fetch news item." });
  }
};

// 🆕 Create news (with multiple images)
export const createNews = async (req, res) => {
  const { title, content } = req.body;
  
  console.log("📝 Create News Request:");
  console.log("- Title:", title);
  console.log("- Content length:", content?.length);
  console.log("- Files received:", req.files?.length || 0);
  
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  try {
    let imageUrls = [];
    
    // Upload each file to Cloudinary
    if (req.files && req.files.length > 0) {
      console.log(`📷 Uploading ${req.files.length} images to Cloudinary...`);
      
      for (const file of req.files) {
        try {
          const imageUrl = await uploadToCloudinary(file.buffer, "news_images");
          imageUrls.push(imageUrl);
          console.log(`✅ Uploaded: ${file.originalname}`);
        } catch (uploadError) {
          console.error("❌ Cloudinary upload error:", uploadError.message);
          // Continue with other images
        }
      }
    }

    console.log(`🎯 Total images uploaded: ${imageUrls.length}`);

    // Create news with images array
    const newNews = new News({ 
      title, 
      content, 
      images: imageUrls,
      image: imageUrls.length > 0 ? imageUrls[0] : null // First image for backward compatibility
    });
    
    await newNews.save();

    // Log successful creation
    await Log.create({
      userId: req.user?._id,
      action: 'CREATE_NEWS',
      details: `Created news: "${title}" with ${imageUrls.length} image(s)`,
      id_number: 'N/A',
      userName: req.user?.name || 'Admin'
    });

    res.status(201).json(newNews);
  } catch (err) {
    console.error("❌ Error creating news:", err);
    res.status(500).json({ 
      error: "Failed to post news.",
      message: err.message 
    });
  }
};

// ✏️ Update news (with multiple images)
export const updateNews = async (req, res) => {
  const { title, content } = req.body;
  
  console.log("📝 Update News Request:");
  console.log("- Title:", title);
  console.log("- Content length:", content?.length);
  console.log("- Files received:", req.files?.length || 0);
  
  if (!title || !content) {
    return res.status(400).json({ error: "Title and content are required." });
  }

  try {
    const existingNews = await News.findById(req.params.id);
    if (!existingNews) {
      return res.status(404).json({ error: "News not found." });
    }

    // Start with existing images
    let imageUrls = existingNews.images || [];
    
    // Add new uploaded images
    if (req.files && req.files.length > 0) {
      console.log(`📷 Adding ${req.files.length} new images...`);
      
      for (const file of req.files) {
        try {
          const imageUrl = await uploadToCloudinary(file.buffer, "news_images");
          imageUrls.push(imageUrl);
          console.log(`✅ Added: ${file.originalname}`);
        } catch (uploadError) {
          console.error("❌ Cloudinary upload error:", uploadError.message);
        }
      }
      
      // Limit to reasonable number
      if (imageUrls.length > 10) {
        imageUrls = imageUrls.slice(0, 10);
      }
    }

    console.log(`🎯 Total images after update: ${imageUrls.length}`);

    // Update the news item
    const updatedNews = await News.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        content, 
        images: imageUrls,
        image: imageUrls.length > 0 ? imageUrls[0] : null
      },
      { new: true, runValidators: true }
    );

    // Log successful update
    await Log.create({
      userId: req.user?._id,
      action: 'UPDATE_NEWS',
      details: `Updated news: "${title}" with ${imageUrls.length} image(s)`,
      id_number: 'N/A',
      userName: req.user?.name || 'Admin'
    });

    res.json(updatedNews);
  } catch (err) {
    console.error("❌ Error updating news:", err);
    res.status(500).json({ 
      error: "Failed to update news.",
      message: err.message 
    });
  }
};

// ❌ Delete news (only archived)
export const deleteNews = async (req, res) => {
  try {
    const deletedNews = await News.findOneAndDelete({ _id: req.params.id, archived: true });
    if (!deletedNews) {
      return res.status(404).json({ error: "News not found or not archived." });
    }

    // Log successful deletion
    await Log.create({
      userId: req.user?._id,
      action: 'DELETE_NEWS',
      details: `Permanently deleted archived news: "${deletedNews.title}"`,
      id_number: 'N/A',
      userName: req.user?.name || 'Admin'
    });

    res.json({ message: "Archived news deleted permanently.", deletedId: deletedNews._id });
  } catch (err) {
    console.error("Error deleting news:", err);
    res.status(500).json({ error: "Failed to delete news." });
  }
};