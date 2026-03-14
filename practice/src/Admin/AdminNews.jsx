import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import AdminNavigation from "./AdminNavigation";
import { Editor, EditorProvider } from "react-simple-wysiwyg";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  Search, 
  ChevronDown, 
  X, 
  CheckSquare, 
  Square,
  AlertTriangle,
  RotateCcw,
  Filter,
  Archive
} from "lucide-react";

function AdminNews({ setView, admin, onLogout }) {
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [editNews, setEditNews] = useState(null);
  const [viewNews, setViewNews] = useState(null);
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [postConfirm, setPostConfirm] = useState(false);
  const [imagePreviewUrls, setImagePreviewUrls] = useState([]);
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });
  const [uploadProgress, setUploadProgress] = useState({}); // Track upload progress per image
  const [isDragging, setIsDragging] = useState(false);
  
  // Selection State for Bulk Actions
  const [selectedNews, setSelectedNews] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const itemsPerPage = 5;

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/news/active`);
      setNewsList(Array.isArray(res.data) ? res.data : []);
      // Clear selections when fetching new data
      setSelectedNews([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Error fetching news:", err);
      setNewsList([]);
      showAlert("Error", "Failed to fetch news: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showAlert = (title, message, type = "info") => {
    setAlertModal({ show: true, title, message, type });
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImages([]);
    setImagePreviewUrls([]);
    setEditNews(null);
    setPreview(null);
    setUploadProgress({});
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Selection Handlers
  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedNews([]);
    } else {
      const filteredIds = filteredNews.map(news => news._id);
      setSelectedNews(filteredIds);
    }
    setSelectAll(!selectAll);
  };

  const handleSelectNews = (newsId) => {
    setSelectedNews(prev => {
      if (prev.includes(newsId)) {
        const newSelected = prev.filter(id => id !== newsId);
        setSelectAll(false);
        return newSelected;
      } else {
        const newSelected = [...prev, newsId];
        // Check if all filtered news are selected
        if (newSelected.length === filteredNews.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

  // Bulk Archive Handler
  const handleBulkArchiveClick = () => {
    if (selectedNews.length === 0) {
      showAlert("No News Selected", "Please select at least one news item to archive.", "warning");
      return;
    }
    setShowBulkArchiveConfirm(true);
  };

  const handleBulkArchiveConfirm = async () => {
    if (selectedNews.length === 0) return;
    
    setIsBulkActionLoading(true);
    
    try {
      // Use Promise.all to archive all selected news
      const archivePromises = selectedNews.map(id => 
        axios.put(`${import.meta.env.VITE_API_URL}/api/news/archive/${id}`)
      );
      
      await Promise.all(archivePromises);
      
      showAlert(
        "Success", 
        `Successfully archived ${selectedNews.length} news item${selectedNews.length !== 1 ? 's' : ''}.`, 
        "success"
      );
      
      // Refresh news list
      fetchNews();
      
      // Clear selections
      setSelectedNews([]);
      setSelectAll(false);
      
    } catch (err) {
      console.error("Bulk archive error:", err);
      showAlert(
        "Error", 
        err.response?.data?.message || "Failed to archive news. Please try again.", 
        "error"
      );
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkArchiveConfirm(false);
    }
  };

  const handleBulkArchiveCancel = () => {
    setShowBulkArchiveConfirm(false);
  };

  // Handle drag and drop events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (isPosting) return;
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    );
    
    if (files.length > 0) {
      handleImageFiles(files);
    }
  };

  const handleImageFiles = (files) => {
    // Limit maximum upload count (e.g., max 5 images)
    const maxImages = 5;
    const totalImages = images.length + files.length;
    if (totalImages > maxImages) {
      showAlert("Warning", `Maximum ${maxImages} images allowed. You have ${images.length} images already.`, "warning");
      return;
    }

    // Filter out duplicates by name and size
    const newImages = files.filter(newFile => 
      !images.some(existingFile => 
        existingFile.name === newFile.name && existingFile.size === newFile.size
      )
    );

    if (newImages.length === 0) {
      showAlert("Info", "Some images are duplicates and were not added.", "info");
      return;
    }

    setImages(prev => [...prev, ...newImages]);

    // Generate preview URLs with progress simulation
    newImages.forEach((file, index) => {
      const reader = new FileReader();
      reader.onloadstart = () => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 0
        }));
      };
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress
          }));
        }
      };
      reader.onloadend = () => {
        setUploadProgress(prev => ({
          ...prev,
          [file.name]: 100
        }));
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 500);
        
        setImagePreviewUrls(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).filter(file => 
      file.type.startsWith('image/')
    );
    if (files.length === 0) return;
    
    handleImageFiles(files);
  };

  const removeImage = (index) => {
    const imageToRemove = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    
    // Clear progress for removed image
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[imageToRemove.name];
      return newProgress;
    });
  };

  const reorderImages = (fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    
    const newImages = [...images];
    const newPreviewUrls = [...imagePreviewUrls];
    
    const [movedImage] = newImages.splice(fromIndex, 1);
    const [movedPreview] = newPreviewUrls.splice(fromIndex, 1);
    
    newImages.splice(toIndex, 0, movedImage);
    newPreviewUrls.splice(toIndex, 0, movedPreview);
    
    setImages(newImages);
    setImagePreviewUrls(newPreviewUrls);
  };

  const handleAddOrUpdate = async () => {
    if (isPosting) return; // Prevent double-clicking
    
    if (!title.trim() || !content.trim()) {
      showAlert("Warning", "Please complete the form", "warning");
      return;
    }

    setIsPosting(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("content", content);
    images.forEach((img) => {
      formData.append("images", img);
    });

    try {
      if (editNews) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/news/${editNews._id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showAlert("Success", "News updated successfully!", "success");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/news`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        showAlert("Success", "News posted successfully!", "success");
      }
      fetchNews();
      resetForm();
      setPostConfirm(false);
    } catch (err) {
      console.error("Error posting/updating news:", err);
      showAlert("Error", "Failed to save: " + (err.response?.data?.message || err.message), "error");
    } finally {
      setIsPosting(false);
    }
  };

  const handleArchiveNews = async () => {
    if (!archiveConfirm) return;

    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/news/archive/${archiveConfirm._id}`);
      setNewsList(prevList =>
        prevList.filter(n => n._id.toString() !== archiveConfirm._id.toString())
      );
      showAlert("Success", "News archived successfully!", "success");
      setArchiveConfirm(null);
    } catch (err) {
      console.error("Error archiving news:", err);
      showAlert("Error", "Failed to archive: " + (err.response?.data?.message || err.message), "error");
    }
  };

  // Filter & sort
  const filteredNews = newsList
    .filter(
      n =>
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "az") return a.title.localeCompare(b.title);
      if (sortBy === "za") return b.title.localeCompare(a.title);
      return 0;
    });

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const paginatedNews = filteredNews.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminNews" onLogout={onLogout}/>
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-[#CC0000]">News Management</h1>
          <p className="text-gray-600">Add, edit and manage news announcements</p>
        </header>

        <div className="p-6">
          {/* Add/Edit Form */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6 transition-all hover:shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-gray-800">
              {editNews ? "Edit News" : "Add News"}
            </h2>
            <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); setPostConfirm(true); }}>
              <input
                type="text"
                placeholder="News Title"
                className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-[#CC0000] outline-0 focus:border-transparent transition-all max-w-2xl"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isPosting}
              />
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#CC0000] focus-within:border-transparent transition-all">
                <EditorProvider>
                  <Editor
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="min-h-[200px]"
                    disabled={isPosting}
                  />
                </EditorProvider>
              </div>

              {/* Enhanced Multiple Image Upload */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  News Images {images.length > 0 && <span className="text-[#CC0000]">({images.length}/5)</span>}
                </label>
                
                {/* Drop Zone */}
                <div
                  ref={dropZoneRef}
                  className={`relative w-full h-48 p-4 border-2 ${isDragging ? 'border-[#CC0000] border-dashed bg-red-50' : 'border-dashed border-gray-300'} rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all duration-200 ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isPosting && fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {imagePreviewUrls.length > 0 ? (
                    <div className="w-full h-full overflow-x-auto">
                      <div className="flex gap-3 h-full items-center pb-2">
                        {imagePreviewUrls.map((url, index) => (
                          <div 
                            key={index} 
                            className="relative h-full flex-shrink-0 group"
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', index.toString());
                            }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.add('border-2', 'border-[#CC0000]');
                            }}
                            onDragLeave={(e) => {
                              e.currentTarget.classList.remove('border-2', 'border-[#CC0000]');
                            }}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.currentTarget.classList.remove('border-2', 'border-[#CC0000]');
                              const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                              reorderImages(fromIndex, index);
                            }}
                          >
                            <div className="relative h-full w-32 rounded-lg overflow-hidden border border-gray-200 group-hover:shadow-md transition-shadow">
                              <img
                                src={url}
                                alt={`Preview ${index + 1}`}
                                className="h-full w-full object-cover"
                              />
                              
                              {/* Upload Progress Indicator */}
                              {uploadProgress[images[index]?.name] !== undefined && uploadProgress[images[index]?.name] < 100 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <div className="text-white text-xs font-semibold">
                                    {uploadProgress[images[index]?.name]}%
                                  </div>
                                </div>
                              )}
                              
                              {/* Image Order Badge */}
                              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {index + 1}
                              </div>
                              
                              {/* Remove Button */}
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeImage(index);
                                }}
                                disabled={isPosting}
                                title="Remove image"
                              >
                                ×
                              </button>
                              
                              {/* Drag Handle */}
                              <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-move">
                                ⋮⋮
                              </div>
                            </div>
                            
                            {/* Image Name */}
                            <p className="text-xs text-gray-500 truncate mt-1 max-w-32">
                              {images[index]?.name || `Image ${index + 1}`}
                            </p>
                          </div>
                        ))}
                        
                        {/* Add More Button */}
                        {images.length < 5 && (
                          <div
                            className="h-full w-32 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition-colors cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                          >
                            <svg className="w-8 h-8 mb-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                            <p className="text-xs text-gray-500 text-center px-2">Add more</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : editNews?.images?.length > 0 ? (
                    <div className="w-full h-full overflow-x-auto">
                      <div className="flex gap-3 h-full items-center">
                        {editNews.images.map((img, index) => (
                          <div key={index} className="relative h-full w-32 flex-shrink-0">
                            <img
                              src={img}
                              alt={`Edit image ${index + 1}`}
                              className="h-full w-full object-cover rounded-lg"
                            />
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full pt-5 pb-6">
                      <svg className="w-10 h-10 mb-3 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <p className="mb-1 text-sm text-gray-500">
                        <span className="font-semibold text-[#CC0000]">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Max 5 images</p>
                      {isDragging && (
                        <div className="absolute inset-0 bg-[#CC0000]/10 border-2 border-[#CC0000] border-dashed rounded-lg flex items-center justify-center">
                          <p className="text-[#CC0000] font-semibold">Drop images here</p>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={isPosting}
                    multiple
                  />
                </div>
                
                {/* Upload Instructions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-2 text-xs text-gray-500">
                  <div className="flex items-center gap-2 mb-1 sm:mb-0">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Drag to reorder</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Click × to remove</span>
                    </div>
                  </div>
                  <p className="text-xs">
                    {images.length > 0 ? `${images.length} image(s) selected` : 'No images selected'}
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <button
                    type="button"
                    className={`px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer flex items-center gap-2 ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => setPreview({ title, content, images: imagePreviewUrls })}
                    disabled={isPosting}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    Preview
                  </button>
                  
                  {images.length > 0 && (
                    <button
                      type="button"
                      className={`px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer flex items-center gap-2 ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => {
                        setImages([]);
                        setImagePreviewUrls([]);
                        setUploadProgress({});
                      }}
                      disabled={isPosting}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear All Images
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {editNews && (
                    <button
                      type="button"
                      className={`px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer flex items-center gap-2 ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={resetForm}
                      disabled={isPosting}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-[#CC0000] text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer min-w-[140px]"
                    disabled={isPosting}
                  >
                    {isPosting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editNews ? "Updating..." : "Posting..."}
                      </>
                    ) : (
                      <>
                        {editNews ? (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Update News
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Post News
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Archive Confirmation Modal */}
          {archiveConfirm && (
            <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-md border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 max-w-md break-words">Confirm Archive</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 cursor-pointer p-1 flex-shrink-0"
                    onClick={() => setArchiveConfirm(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to archive "<span className="font-semibold break-words">{archiveConfirm.title}</span>"? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer"
                    onClick={() => setArchiveConfirm(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 cursor-pointer"
                    onClick={handleArchiveNews}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Archive News
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bulk Archive Confirmation Modal */}
          {showBulkArchiveConfirm && (
            <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-md border border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-orange-100 rounded-full flex-shrink-0">
                    <Archive size={24} className="text-orange-600" />
                  </div>
                  <h2 className="text-xl font-bold text-gray-800 max-w-sm break-words">Archive Multiple News</h2>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to archive {selectedNews.length} selected news item{selectedNews.length !== 1 ? 's' : ''}? This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer"
                    onClick={handleBulkArchiveCancel}
                    disabled={isBulkActionLoading}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleBulkArchiveConfirm}
                    disabled={isBulkActionLoading}
                  >
                    {isBulkActionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Archiving...
                      </>
                    ) : (
                      <>
                        <Archive size={16} />
                        Archive All
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Post Confirmation Modal */}
          {postConfirm && (
            <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-md border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 max-w-md break-words">Confirm {editNews ? "Update" : "Post"}</h2>
                  <button 
                    className="text-gray-500 hover:text-gray-700 p-1 cursor-pointer flex-shrink-0" 
                    onClick={() => setPostConfirm(false)}
                    disabled={isPosting}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="mb-4">
                  <p className="text-gray-600 mb-2">
                    Are you sure you want to {editNews ? "update" : "post"} this news?
                  </p>
                  {images.length > 0 && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-semibold">{images.length} image(s)</span> will be uploaded:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {images.slice(0, 3).map((img, index) => (
                          <span key={index} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                            {img.name}
                          </span>
                        ))}
                        {images.length > 3 && (
                          <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200">
                            +{images.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    className="px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    onClick={() => setPostConfirm(false)}
                    disabled={isPosting}
                  >
                    Cancel
                  </button>
                  <button
                    className="px-4 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    onClick={handleAddOrUpdate}
                    disabled={isPosting}
                  >
                    {isPosting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editNews ? "Updating..." : "Posting..."}
                      </>
                    ) : (
                      editNews ? "Update News" : "Post News"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Enhanced Preview Modal */}
          {preview && (
            <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 max-w-3xl break-words">Preview News</h2>
                  <button 
                    className="text-gray-500 hover:text-gray-700 cursor-pointer p-1 flex-shrink-0" 
                    onClick={() => setPreview(null)}
                    disabled={isPosting}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center border border-gray-500 rounded-full w-12 h-12 bg-yellow-300 flex-shrink-0">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9.003 9.003 0 0112 15c2.21 0 4.21.804 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="font-bold text-base">USA-FLD Admin</h1>
                      <p className="text-xs text-gray-500">Just now</p>
                    </div>
                  </div>
                  
                  {preview.images && preview.images.length > 0 && (
                    <div className="mb-4">
                      <div className={`grid gap-2 ${preview.images.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'} mb-2`}>
                        {preview.images.slice(0, 3).map((img, index) => (
                          <img 
                            key={index} 
                            src={img} 
                            alt={`Preview ${index + 1}`} 
                            className="w-full h-48 object-cover rounded-lg"
                          />
                        ))}
                      </div>
                      {preview.images.length > 3 && (
                        <p className="text-xs text-gray-500 text-center">
                          +{preview.images.length - 3} more images will be shown in the actual post
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="border-b border-gray-200 mb-3" />
                  <h3 className="text-xl font-bold text-gray-800 mb-3 max-w-2xl break-words">{preview.title}</h3>
                  <div 
                    className="prose max-w-none text-gray-600"
                    dangerouslySetInnerHTML={{ __html: preview.content }}
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <button
                    className="px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer"
                    onClick={() => setPreview(null)}
                  >
                    Close Preview
                  </button>
                  <button
                    className="px-4 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium cursor-pointer"
                    onClick={() => {
                      setPreview(null);
                      setPostConfirm(true);
                    }}
                  >
                    Continue to Post
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Search & Sort */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="relative w-full md:w-1/3">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
                </div>
                <input
                  type="text"
                  placeholder="Search news..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border border-gray-300 p-2.5 pl-10 rounded-lg w-full focus:ring-2 focus:ring-[#CC0000] outline-0 focus:border-transparent"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Sort by:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-[#CC0000] outline-0 focus:border-transparent"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="az">Title A–Z</option>
                  <option value="za">Title Z–A</option>
                </select>
              </div>
            </div>

            {/* Bulk Actions Row */}
            <div className="flex flex-wrap items-center gap-3 mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer text-sm"
                >
                  {selectAll ? <Square size={16} /> : <CheckSquare size={16} />}
                  <span>{selectAll ? "Deselect All" : "Select All"}</span>
                </button>
                <span className="text-sm text-gray-600">
                  {selectedNews.length} item{selectedNews.length !== 1 ? 's' : ''} selected
                </span>
              </div>

              {selectedNews.length > 0 && (
                <button
                  onClick={handleBulkArchiveClick}
                  className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors cursor-pointer text-sm"
                >
                  <Archive size={16} />
                  <span>Archive Selected</span>
                </button>
              )}

              <div className="flex-1"></div>

              <button
                onClick={fetchNews}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* News List */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800 max-w-lg break-words">News List</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex-shrink-0">
                {filteredNews.length} {filteredNews.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {isLoading ? (
              <div className="text-center p-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#CC0000] mb-2"></div>
                <p className="text-gray-500 font-bold">Loading News...</p>
              </div>
            ) : paginatedNews.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900 max-w-md break-words">No news found</h3>
                <p className="mt-1 text-sm text-gray-500 max-w-md break-words">Try adjusting your search or add a new news item.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <button
                          onClick={handleSelectAll}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          {selectAll ? <CheckSquare size={18} /> : <Square size={18} />}
                        </button>
                      </th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Images</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedNews.map((item, index) => (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 whitespace-nowrap">
                          <button
                            onClick={() => handleSelectNews(item._id)}
                            className="text-gray-600 hover:text-gray-800"
                          >
                            {selectedNews.includes(item._id) ? (
                              <CheckSquare size={18} className="text-[#CC0000]" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </td>
                        <td className="p-3 text-gray-700">{(page - 1) * itemsPerPage + index + 1}</td>
                        <td className="p-3 font-medium text-gray-900 max-w-xs truncate">{item.title}</td>
                        <td className="p-3">
                          {item.images && item.images.length > 0 ? (
                            <div className="flex gap-1">
                              {item.images.slice(0, 3).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`Cover ${idx + 1}`}
                                  className="h-12 w-12 object-cover rounded-lg"
                                />
                              ))}
                              {item.images.length > 3 && (
                                <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center text-xs text-gray-500">
                                  +{item.images.length - 3}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No images</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-600 max-w-xs">
                          <div
                            className="truncate"
                            dangerouslySetInnerHTML={{ __html: item.content }}
                          />
                        </td>
                        <td className="p-3 text-gray-500 text-sm">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2">
                            <button
                              className="text-gray-600 hover:text-gray-800 p-2 rounded-md bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer"
                              onClick={() => setViewNews(item)}
                              title="View"
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer"
                              onClick={() => {
                                setEditNews(item);
                                setTitle(item.title);
                                setContent(item.content);
                                if (item.images && item.images.length > 0) {
                                  setImagePreviewUrls(item.images);
                                }
                                setImages([]);
                              }}
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            
                            <button
                              className="text-orange-600 hover:text-orange-800 p-2 rounded-md bg-orange-50 hover:bg-orange-100 transition-all cursor-pointer"
                              onClick={() => setArchiveConfirm(item)}
                              title="Archive"
                            >
                              <Archive size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {filteredNews.length > 0 && (
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500 max-w-md break-words">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredNews.length)} of {filteredNews.length} entries
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Previous
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer ${
                            page === pageNum
                              ? "bg-[#CC0000] text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          } transition-colors`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                    className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Next
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* View News Modal */}
          {viewNews && (
            <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800 max-w-3xl break-words">News Details</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 cursor-pointer p-1 flex-shrink-0"
                    onClick={() => setViewNews(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2 max-w-xl break-words">{viewNews.title}</h3>
                  <p className="text-sm text-gray-500">
                    Posted on: {new Date(viewNews.createdAt).toLocaleString()}
                  </p>
                </div>
                
                {viewNews.images && viewNews.images.length > 0 && (
                  <div className="mb-6">
                    <div className="flex overflow-x-auto gap-4 pb-4">
                      {viewNews.images.map((img, index) => (
                        <img
                          key={index}
                          src={img}
                          alt={`News image ${index + 1}`}
                          className="h-64 w-auto object-contain rounded-xl flex-shrink-0"
                        />
                      ))}
                    </div>
                    <p className="text-sm text-gray-500 text-center mt-2">
                      {viewNews.images.length} image(s)
                    </p>
                  </div>
                )}
                
                <div
                  className="prose max-w-3xl mb-6"
                  dangerouslySetInnerHTML={{ __html: viewNews.content }}
                />
                
                <div className="flex justify-end">
                  <button
                    className="px-4 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors font-medium cursor-pointer"
                    onClick={() => setViewNews(null)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Alert Modal */}
      {alertModal.show && (
        <AlertModal
          title={alertModal.title}
          message={alertModal.message}
          type={alertModal.type}
          onClose={() => setAlertModal({ show: false, title: "", message: "", type: "info" })}
        />
      )}

      {/* Loading Overlay for Bulk Actions */}
      {isBulkActionLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 max-w-xs break-words text-center">
                Processing
              </h3>
              <p className="text-gray-600 text-center max-w-xs break-words">
                Please wait while we archive the selected items...
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Alert Modal Component
function AlertModal({ title, message, type = "info", onClose }) {
  const getIcon = () => {
    switch (type) {
      case "success":
        return (
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "error":
        return (
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "warning":
        return (
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case "success":
        return "bg-green-50 border-green-200";
      case "error":
        return "bg-red-50 border-red-200";
      case "warning":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-blue-50 border-blue-200";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
      <div className={`bg-white rounded-2xl shadow-xl w-full max-w-md border ${getBackgroundColor()}`}>
        <div className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
              {getIcon()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 max-w-sm break-words">
                {title}
              </h3>
              <p className="text-gray-600 mt-1 max-w-sm break-words">
                {message}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm cursor-pointer"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminNews;