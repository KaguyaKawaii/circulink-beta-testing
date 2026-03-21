// AdminNews.jsx - Fully Responsive Version
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import AdminNavigation from "./AdminNavigation";
import { Editor, EditorProvider } from "react-simple-wysiwyg";
import { 
  Eye, 
  Trash2, 
  RefreshCw, 
  Search, 
  X, 
  CheckSquare, 
  Square,
  Archive,
  Upload,
  Image as ImageIcon
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
  const [uploadProgress, setUploadProgress] = useState({});
  const [isDragging, setIsDragging] = useState(false);
  const [selectedNews, setSelectedNews] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [showBulkArchiveConfirm, setShowBulkArchiveConfirm] = useState(false);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);

  const itemsPerPage = isMobile ? 3 : 5;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/news/active`);
      setNewsList(Array.isArray(res.data) ? res.data : []);
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
        if (newSelected.length === filteredNews.length) {
          setSelectAll(true);
        }
        return newSelected;
      }
    });
  };

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
      const archivePromises = selectedNews.map(id => 
        axios.put(`${import.meta.env.VITE_API_URL}/api/news/archive/${id}`)
      );
      await Promise.all(archivePromises);
      showAlert("Success", `Successfully archived ${selectedNews.length} news item${selectedNews.length !== 1 ? 's' : ''}.`, "success");
      fetchNews();
      setSelectedNews([]);
      setSelectAll(false);
    } catch (err) {
      console.error("Bulk archive error:", err);
      showAlert("Error", err.response?.data?.message || "Failed to archive news. Please try again.", "error");
    } finally {
      setIsBulkActionLoading(false);
      setShowBulkArchiveConfirm(false);
    }
  };

  const handleBulkArchiveCancel = () => {
    setShowBulkArchiveConfirm(false);
  };

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
    
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
    if (files.length > 0) {
      handleImageFiles(files);
    }
  };

  const handleImageFiles = (files) => {
    const maxImages = 5;
    const totalImages = images.length + files.length;
    if (totalImages > maxImages) {
      showAlert("Warning", `Maximum ${maxImages} images allowed. You have ${images.length} images already.`, "warning");
      return;
    }

    const newImages = files.filter(newFile => 
      !images.some(existingFile => existingFile.name === newFile.name && existingFile.size === newFile.size)
    );

    if (newImages.length === 0) {
      showAlert("Info", "Some images are duplicates and were not added.", "info");
      return;
    }

    setImages(prev => [...prev, ...newImages]);

    newImages.forEach((file) => {
      const reader = new FileReader();
      reader.onloadstart = () => {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
      };
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        }
      };
      reader.onloadend = () => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
        setImagePreviewUrls(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files).filter(file => file.type.startsWith('image/'));
    if (files.length === 0) return;
    handleImageFiles(files);
  };

  const removeImage = (index) => {
    const imageToRemove = images[index];
    setImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviewUrls(prev => prev.filter((_, i) => i !== index));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[imageToRemove.name];
      return newProgress;
    });
  };

  const handleAddOrUpdate = async () => {
    if (isPosting) return;
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
      setNewsList(prevList => prevList.filter(n => n._id.toString() !== archiveConfirm._id.toString()));
      showAlert("Success", "News archived successfully!", "success");
      setArchiveConfirm(null);
    } catch (err) {
      console.error("Error archiving news:", err);
      showAlert("Error", "Failed to archive: " + (err.response?.data?.message || err.message), "error");
    }
  };

  const filteredNews = newsList
    .filter(n => n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "newest") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "az") return a.title.localeCompare(b.title);
      if (sortBy === "za") return b.title.localeCompare(a.title);
      return 0;
    });

  const totalPages = Math.ceil(filteredNews.length / itemsPerPage);
  const paginatedNews = filteredNews.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  // Mobile Card Component
  const NewsCard = ({ item, index }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-3 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => handleSelectNews(item._id)} className="text-gray-600 hover:text-gray-800">
            {selectedNews.includes(item._id) ? (
              <CheckSquare size={20} className="text-[#CC0000]" />
            ) : (
              <Square size={20} />
            )}
          </button>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            #{index}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      </div>
      
      <h3 className="font-semibold text-gray-900 text-base mb-2 line-clamp-2">{item.title}</h3>
      
      {item.images && item.images.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {item.images.slice(0, 3).map((img, idx) => (
            <img key={idx} src={img} alt="" className="h-16 w-16 object-cover rounded-lg flex-shrink-0 border border-gray-200" />
          ))}
          {item.images.length > 3 && (
            <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500 flex-shrink-0">
              +{item.images.length - 3}
            </div>
          )}
        </div>
      )}
      
      <div className="text-gray-600 text-sm mb-3 line-clamp-2" dangerouslySetInnerHTML={{ __html: item.content }} />
      
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <button onClick={() => setViewNews(item)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors text-sm">
          <Eye size={14} /><span>View</span>
        </button>
        <button onClick={() => {
          setEditNews(item);
          setTitle(item.title);
          setContent(item.content);
          if (item.images && item.images.length > 0) setImagePreviewUrls(item.images);
          setImages([]);
        }} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-50 rounded-lg text-blue-600 hover:bg-blue-100 transition-colors text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span>Edit</span>
        </button>
        <button onClick={() => setArchiveConfirm(item)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-50 rounded-lg text-orange-600 hover:bg-orange-100 transition-colors text-sm">
          <Archive size={14} /><span>Archive</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <AdminNavigation setView={setView} currentView="adminNews" onLogout={onLogout}/>
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        <header className="bg-white px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h1 className="text-xl sm:text-2xl font-bold text-[#CC0000]">News Management</h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-0.5">Add, edit and manage news announcements</p>
        </header>

        <div className="p-3 sm:p-4 md:p-6">
          {/* Add/Edit Form */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 text-gray-800">
              {editNews ? "Edit News" : "Add News"}
            </h2>
            <form className="flex flex-col gap-3 sm:gap-4" onSubmit={e => { e.preventDefault(); setPostConfirm(true); }}>
              <input
                type="text"
                placeholder="News Title"
                className="border border-gray-300 p-2.5 sm:p-3 rounded-lg focus:ring-2 focus:ring-[#CC0000] outline-0 focus:border-transparent w-full text-sm sm:text-base"
                value={title}
                onChange={e => setTitle(e.target.value)}
                disabled={isPosting}
              />
              
              <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#CC0000]">
                <EditorProvider>
                  <Editor
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    className="min-h-[150px] sm:min-h-[200px]"
                    disabled={isPosting}
                  />
                </EditorProvider>
              </div>

              {/* Image Upload */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">
                  News Images {images.length > 0 && <span className="text-[#CC0000]">({images.length}/5)</span>}
                </label>
                
                <div
                  ref={dropZoneRef}
                  className={`relative w-full h-36 sm:h-48 p-3 sm:p-4 border-2 ${isDragging ? 'border-[#CC0000] border-dashed bg-red-50' : 'border-dashed border-gray-300'} rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-all ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !isPosting && fileInputRef.current?.click()}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {imagePreviewUrls.length > 0 ? (
                    <div className="w-full h-full overflow-x-auto">
                      <div className="flex gap-2 sm:gap-3 h-full items-center pb-2">
                        {imagePreviewUrls.map((url, index) => (
                          <div key={index} className="relative h-full flex-shrink-0 group">
                            <div className="relative h-full w-24 sm:w-32 rounded-lg overflow-hidden border border-gray-200">
                              <img src={url} alt={`Preview ${index + 1}`} className="h-full w-full object-cover" />
                              {uploadProgress[images[index]?.name] !== undefined && uploadProgress[images[index]?.name] < 100 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <div className="text-white text-xs font-semibold">{uploadProgress[images[index]?.name]}%</div>
                                </div>
                              )}
                              <div className="absolute top-1 left-1 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{index + 1}</div>
                              <button
                                type="button"
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                                disabled={isPosting}
                              >×</button>
                            </div>
                            <p className="text-[10px] text-gray-500 truncate mt-1 max-w-24 sm:max-w-32">{images[index]?.name?.slice(0, 15)}</p>
                          </div>
                        ))}
                        {images.length < 5 && (
                          <div className="h-full w-24 sm:w-32 flex-shrink-0 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-white hover:bg-gray-50 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                            <Upload size={20} className="mb-1 text-gray-400" />
                            <p className="text-[10px] text-gray-500 text-center">Add more</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : editNews?.images?.length > 0 ? (
                    <div className="w-full h-full overflow-x-auto">
                      <div className="flex gap-2 sm:gap-3 h-full items-center">
                        {editNews.images.map((img, index) => (
                          <div key={index} className="relative h-full w-24 sm:w-32 flex-shrink-0">
                            <img src={img} alt="" className="h-full w-full object-cover rounded-lg" />
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{index + 1}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full">
                      <Upload size={24} className="mb-2 text-gray-400" />
                      <p className="text-xs sm:text-sm text-gray-500 text-center">
                        <span className="font-semibold text-[#CC0000]">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 mt-1">Max 5 images</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} disabled={isPosting} multiple />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 pt-2">
                <div className="flex gap-2">
                  <button type="button" className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2 text-sm ${isPosting ? 'opacity-50' : ''}`}
                    onClick={() => setPreview({ title, content, images: imagePreviewUrls })} disabled={isPosting}>
                    <Eye size={16} /> Preview
                  </button>
                  {images.length > 0 && (
                    <button type="button" className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2 text-sm ${isPosting ? 'opacity-50' : ''}`}
                      onClick={() => { setImages([]); setImagePreviewUrls([]); setUploadProgress({}); }} disabled={isPosting}>
                      <Trash2 size={14} /> Clear
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  {editNews && (
                    <button type="button" className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium flex items-center justify-center gap-2 text-sm ${isPosting ? 'opacity-50' : ''}`}
                      onClick={resetForm} disabled={isPosting}>
                      <X size={14} /> Cancel
                    </button>
                  )}
                  <button type="submit" className="flex-1 sm:flex-none bg-[#CC0000] text-white px-4 sm:px-5 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                    disabled={isPosting}>
                    {isPosting ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{editNews ? "Updating..." : "Posting..."}</>
                    ) : (editNews ? "Update News" : "Post News")}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Search & Bulk Actions */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
            <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
              <div className="relative w-full sm:w-2/3 md:w-1/2">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
                </div>
                <input type="text" placeholder="Search news..." value={search} onChange={(e) => setSearch(e.target.value)}
                  className="border border-gray-300 p-2.5 pl-10 rounded-lg w-full focus:ring-2 focus:ring-[#CC0000] outline-0 text-sm" />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-600">Sort:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-300 p-2 rounded-lg focus:ring-2 focus:ring-[#CC0000] outline-0 text-sm flex-1 sm:flex-none">
                  <option value="newest">Newest</option><option value="oldest">Oldest</option>
                  <option value="az">Title A–Z</option><option value="za">Title Z–A</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-200">
              <button onClick={handleSelectAll} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-xs sm:text-sm">
                {selectAll ? <Square size={14} /> : <CheckSquare size={14} />}
                <span>{selectAll ? "Deselect All" : "Select All"}</span>
              </button>
              <span className="text-xs text-gray-600">{selectedNews.length} selected</span>
              {selectedNews.length > 0 && (
                <button onClick={handleBulkArchiveClick} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-xs sm:text-sm">
                  <Archive size={14} /> <span>Archive Selected</span>
                </button>
              )}
              <div className="flex-1"></div>
              <button onClick={fetchNews} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm">
                <RefreshCw size={14} /> <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* News List */}
          <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800">News List</h2>
              <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 sm:px-3 py-1 rounded-full">
                {filteredNews.length} {filteredNews.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {isLoading ? (
              <div className="text-center p-6 sm:p-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#CC0000] mb-2"></div>
                <p className="text-gray-500 text-sm">Loading News...</p>
              </div>
            ) : paginatedNews.length === 0 ? (
              <div className="text-center py-8 sm:py-12 border border-dashed border-gray-300 rounded-lg">
                <ImageIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No news found</h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">Try adjusting your search or add a new news item.</p>
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                          <button onClick={handleSelectAll} className="text-gray-600 hover:text-gray-800">
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
                            <button onClick={() => handleSelectNews(item._id)} className="text-gray-600 hover:text-gray-800">
                              {selectedNews.includes(item._id) ? <CheckSquare size={18} className="text-[#CC0000]" /> : <Square size={18} />}
                            </button>
                          </td>
                          <td className="p-3 text-gray-700">{(page - 1) * itemsPerPage + index + 1}</td>
                          <td className="p-3 font-medium text-gray-900 max-w-xs"><div className="truncate max-w-[200px]" title={item.title}>{item.title}</div></td>
                          <td className="p-3">
                            {item.images && item.images.length > 0 ? (
                              <div className="flex gap-1">
                                {item.images.slice(0, 2).map((img, idx) => (
                                  <img key={idx} src={img} alt="" className="h-10 w-10 object-cover rounded-lg border border-gray-200" />
                                ))}
                                {item.images.length > 2 && (
                                  <div className="h-10 w-10 bg-gray-100 rounded-lg flex items-center justify-center text-xs text-gray-500">+{item.images.length - 2}</div>
                                )}
                              </div>
                            ) : <span className="text-gray-400 text-xs">No images</span>}
                          </td>
                          <td className="p-3 text-gray-600 max-w-xs">
                            <div className="truncate max-w-[200px]" dangerouslySetInnerHTML={{ __html: item.content }} />
                          </td>
                          <td className="p-3 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-1">
                              <button onClick={() => setViewNews(item)} className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200" title="View"><Eye size={14} /></button>
                              <button onClick={() => { setEditNews(item); setTitle(item.title); setContent(item.content); if (item.images) setImagePreviewUrls(item.images); setImages([]); }} 
                                className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600" title="Edit">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button onClick={() => setArchiveConfirm(item)} className="p-1.5 rounded-md bg-orange-50 hover:bg-orange-100 text-orange-600" title="Archive"><Archive size={14} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden">
                  {paginatedNews.map((item, index) => (
                    <NewsCard key={item._id} item={item} index={(page - 1) * itemsPerPage + index + 1} />
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {filteredNews.length > 0 && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-4 border-t border-gray-200">
                <div className="text-xs sm:text-sm text-gray-500 text-center sm:text-left">
                  Showing {(page - 1) * itemsPerPage + 1} to {Math.min(page * itemsPerPage, filteredNews.length)} of {filteredNews.length}
                </div>
                <div className="flex gap-1">
                  <button disabled={page === 1} onClick={() => setPage(page - 1)}
                    className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Prev
                  </button>
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let pageNum = totalPages <= 5 ? i + 1 : (page <= 3 ? i + 1 : (page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i));
                      return (
                        <button key={pageNum} onClick={() => setPage(pageNum)}
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm cursor-pointer ${page === pageNum ? "bg-[#CC0000] text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button disabled={page === totalPages} onClick={() => setPage(page + 1)}
                    className="px-3 py-1.5 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-xs sm:text-sm">
                    Next <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Archive Confirmation Modal */}
      {archiveConfirm && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-md border border-gray-200 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 break-words">Confirm Archive</h2>
              <button onClick={() => setArchiveConfirm(null)} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Are you sure you want to archive "<span className="font-semibold break-words">{archiveConfirm.title}</span>"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setArchiveConfirm(null)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium text-sm">Cancel</button>
              <button onClick={handleArchiveNews} className="px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm"><Archive size={16} /> Archive</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Archive Confirmation Modal */}
      {showBulkArchiveConfirm && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-md border border-gray-200 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-100 rounded-full"><Archive size={24} className="text-orange-600" /></div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Archive Multiple News</h2>
            </div>
            <p className="text-sm sm:text-base text-gray-600 mb-6">
              Are you sure you want to archive {selectedNews.length} selected news item{selectedNews.length !== 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={handleBulkArchiveCancel} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium text-sm" disabled={isBulkActionLoading}>Cancel</button>
              <button onClick={handleBulkArchiveConfirm} className="px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm" disabled={isBulkActionLoading}>
                {isBulkActionLoading ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> Archiving...</> : <><Archive size={16} /> Archive All</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post Confirmation Modal */}
      {postConfirm && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-md border border-gray-200 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Confirm {editNews ? "Update" : "Post"}</h2>
              <button onClick={() => setPostConfirm(false)} className="text-gray-500 hover:text-gray-700 p-1"><X size={20} /></button>
            </div>
            <div className="mb-4">
              <p className="text-sm sm:text-base text-gray-600 mb-2">Are you sure you want to {editNews ? "update" : "post"} this news?</p>
              {images.length > 0 && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1"><span className="font-semibold">{images.length} image(s)</span> will be uploaded:</p>
                  <div className="flex flex-wrap gap-1">
                    {images.slice(0, 3).map((img, index) => (
                      <span key={index} className="text-xs bg-white px-2 py-1 rounded border border-gray-200">{img.name}</span>
                    ))}
                    {images.length > 3 && <span className="text-xs bg-white px-2 py-1 rounded border border-gray-200">+{images.length - 3} more</span>}
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setPostConfirm(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium text-sm" disabled={isPosting}>Cancel</button>
              <button onClick={handleAddOrUpdate} className="px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 font-medium flex items-center gap-2 text-sm" disabled={isPosting}>
                {isPosting ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> {editNews ? "Updating..." : "Posting..."}</> : (editNews ? "Update News" : "Post News")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Preview News</h2>
              <button onClick={() => setPreview(null)} className="text-gray-500 hover:text-gray-700 p-1"><X size={24} /></button>
            </div>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center border border-gray-500 rounded-full w-12 h-12 bg-yellow-300">
                  <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A9.003 9.003 0 0112 15c2.21 0 4.21.804 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                </div>
                <div><h1 className="font-bold text-base">USA-FLD Admin</h1><p className="text-xs text-gray-500">Just now</p></div>
              </div>
              {preview.images && preview.images.length > 0 && (
                <div className="mb-4">
                  <div className="flex overflow-x-auto gap-2 pb-2">
                    {preview.images.slice(0, 3).map((img, index) => (
                      <img key={index} src={img} alt="" className="h-32 w-32 object-cover rounded-lg flex-shrink-0" />
                    ))}
                  </div>
                  {preview.images.length > 3 && <p className="text-xs text-gray-500 text-center">+{preview.images.length - 3} more images</p>}
                </div>
              )}
              <div className="border-b border-gray-200 mb-3" />
              <h3 className="text-xl font-bold text-gray-800 mb-3 break-words">{preview.title}</h3>
              <div className="prose max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: preview.content }} />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPreview(null)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 font-medium">Close Preview</button>
              <button onClick={() => { setPreview(null); setPostConfirm(true); }} className="px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 font-medium">Continue to Post</button>
            </div>
          </div>
        </div>
      )}

      {/* View News Modal */}
      {viewNews && (
        <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-200 mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">News Details</h2>
              <button onClick={() => setViewNews(null)} className="text-gray-500 hover:text-gray-700 p-1"><X size={24} /></button>
            </div>
            <div className="mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 break-words">{viewNews.title}</h3>
              <p className="text-xs sm:text-sm text-gray-500">Posted on: {new Date(viewNews.createdAt).toLocaleString()}</p>
            </div>
            {viewNews.images && viewNews.images.length > 0 && (
              <div className="mb-6">
                <div className="flex overflow-x-auto gap-4 pb-4">
                  {viewNews.images.map((img, index) => (
                    <img key={index} src={img} alt="" className="h-48 w-auto object-contain rounded-xl flex-shrink-0" />
                  ))}
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">{viewNews.images.length} image(s)</p>
              </div>
            )}
            <div className="mb-6 max-h-96 overflow-y-auto prose max-w-none" dangerouslySetInnerHTML={{ __html: viewNews.content }} />
            <div className="flex justify-end">
              <button onClick={() => setViewNews(null)} className="px-4 py-2 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
          <div className={`bg-white rounded-2xl shadow-xl w-full max-w-[90%] sm:max-w-md border ${
            alertModal.type === "success" ? "bg-green-50 border-green-200" :
            alertModal.type === "error" ? "bg-red-50 border-red-200" :
            alertModal.type === "warning" ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"
          }`}>
            <div className="p-4 sm:p-6">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="p-1.5 sm:p-2 bg-white rounded-lg shadow-sm">
                  {alertModal.type === "success" && <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  {alertModal.type === "error" && <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                  {alertModal.type === "warning" && <svg className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
                  {alertModal.type === "info" && <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                </div>
                <div className="flex-1">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{alertModal.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">{alertModal.message}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 rounded-b-2xl">
              <button onClick={() => setAlertModal({ show: false, title: "", message: "", type: "info" })} className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all font-medium text-xs sm:text-sm">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Bulk Actions */}
      {isBulkActionLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <div className="flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Processing</h3>
              <p className="text-gray-600 text-center">Please wait while we archive the selected items...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminNews;