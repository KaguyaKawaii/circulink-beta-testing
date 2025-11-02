import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminNavigation from "./AdminNavigation";
import { Editor, EditorProvider } from "react-simple-wysiwyg";

function AdminNews({ setView, admin, onLogout }) {
  const [newsList, setNewsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [image, setImage] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [preview, setPreview] = useState(null);
  const [editNews, setEditNews] = useState(null);
  const [viewNews, setViewNews] = useState(null);
  const [archiveConfirm, setArchiveConfirm] = useState(null);
  const [postConfirm, setPostConfirm] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [alertModal, setAlertModal] = useState({ show: false, title: "", message: "", type: "info" });

  const itemsPerPage = 5;

  useEffect(() => {
    fetchNews();
  }, []);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/news/active`);
      setNewsList(Array.isArray(res.data) ? res.data : []);
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
    setImage(null);
    setImagePreviewUrl("");
    setEditNews(null);
    setPreview(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviewUrl(reader.result);
      reader.readAsDataURL(file);
    }
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
    if (image) formData.append("image", image);

    try {
      if (editNews) {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/news/${editNews._id}`, formData);
        showAlert("Success", "News updated successfully!", "success");
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/news`, formData);
        showAlert("Success", "News posted successfully!", "success");
      }
      fetchNews();
      resetForm();
      setPostConfirm(false);
    } catch (err) {
      console.error("Error posting/updating news:", err);
      showAlert("Error", "Failed to save news: " + (err.response?.data?.message || err.message), "error");
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
      showAlert("Error", "Failed to archive news: " + (err.response?.data?.message || err.message), "error");
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
      <AdminNavigation setView={setView} currentView="adminNews" />
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
                className="border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-[#CC0000] outline-0 focus:border-transparent transition-all"
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

              {/* Image upload */}
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700 mb-1">News Image</label>
                <label className={`flex flex-col items-center justify-center w-full h-40 p-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  {imagePreviewUrl || editNews?.image ? (
                    <img
                      src={imagePreviewUrl || editNews.image}
                      alt="Preview"
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <svg className="w-8 h-8 mb-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2" />
                      </svg>
                      <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    disabled={isPosting}
                  />
                </label>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  className={`px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => setPreview({ title, content, image: imagePreviewUrl || editNews?.image })}
                  disabled={isPosting}
                >
                  Preview
                </button>
                <div className="flex gap-2">
                  {editNews && (
                    <button
                      type="button"
                      className={`px-4 py-2.5 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors font-medium cursor-pointer ${isPosting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={resetForm}
                      disabled={isPosting}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    className="bg-[#CC0000] text-white px-5 py-2.5 rounded-lg hover:bg-red-700 transition-colors font-medium shadow-sm hover:shadow flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={isPosting}
                  >
                    {isPosting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white "></div>
                        {editNews ? "Updating..." : "Posting..."}
                      </>
                    ) : (
                      editNews ? "Update News" : "Post News"
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
                  <h2 className="text-xl font-bold text-gray-800">Confirm Archive</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 cursor-pointer p-1"
                    onClick={() => setArchiveConfirm(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to archive "<span className="font-semibold">{archiveConfirm.title}</span>"? This action cannot be undone.
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

          {/* Post Confirmation Modal */}
          {postConfirm && (
            <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-md border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Confirm {editNews ? "Update" : "Post"}</h2>
                  <button 
                    className="text-gray-500 hover:text-gray-700 p-1 cursor-pointer" 
                    onClick={() => setPostConfirm(false)}
                    disabled={isPosting}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mb-6">
                  Are you sure you want to {editNews ? "update" : "post"} this news?
                </p>
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

          {/* Preview Modal */}
          {preview && (
            <div className="fixed inset-0 bg-black/25 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
              <div className="bg-white p-6 rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto border border-gray-200">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-800">Preview</h2>
                  <button 
                    className="text-gray-500 hover:text-gray-700 cursor-pointer p-1" 
                    onClick={() => setPreview(null)}
                    disabled={isPosting}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {preview.image && (
                  <img src={preview.image} alt="News" className="w-full h-64 object-contain rounded-lg mb-4" />
                )}
                <h3 className="text-2xl font-semibold mb-2">{preview.title}</h3>
                <div className="mb-4" dangerouslySetInnerHTML={{ __html: preview.content }}></div>
              </div>
            </div>
          )}

          {/* Search & Sort */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4 flex justify-between items-center">
            <div className="relative w-1/3">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search news..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-gray-300 p-2.5 pl-10 rounded-lg w-full focus:ring-2 focus:ring-[#CC0000] outline-0 focus:border-transparent"
              />
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

          {/* News List */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-800">News List</h2>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filteredNews.length} {filteredNews.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {isLoading ? (
              <div className="text-center p-8">
                <div className="text-center">

  <p className="text-gray-500 font-bold">Loading News...</p>


</div>
              </div>
            ) : paginatedNews.length === 0 ? (
              <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No news found</h3>
                <p className="mt-1 text-sm text-gray-500">Try adjusting your search or add a new news item.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Image</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Content</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted</th>
                      <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedNews.map((item, index) => (
                      <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-gray-700">{(page - 1) * itemsPerPage + index + 1}</td>
                        <td className="p-3 font-medium text-gray-900">{item.title}</td>
                        <td className="p-3">
                          {item.image && (
                            <img
                              src={item.image}
                              alt="cover"
                              className="h-12 w-12 object-cover rounded-lg"
                            />
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
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>

                            <button
                              className="text-blue-600 hover:text-blue-800 p-2 rounded-md bg-blue-50 hover:bg-blue-100 transition-all cursor-pointer"
                              onClick={() => {
                                setEditNews(item);
                                setTitle(item.title);
                                setContent(item.content);
                                setImagePreviewUrl(item.image || "");
                              }}
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            
                            <button
                              className="text-[#CC0000] hover:text-red-800 p-2 rounded-md bg-red-50 hover:bg-red-100 transition-all cursor-pointer"
                              onClick={() => setArchiveConfirm(item)}
                              title="Archive"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
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
                <div className="text-sm text-gray-500">
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
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
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
                    ))}
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
                  <h2 className="text-xl font-bold text-gray-800">News Details</h2>
                  <button
                    className="text-gray-500 hover:text-gray-700 cursor-pointer p-1"
                    onClick={() => setViewNews(null)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{viewNews.title}</h3>
                  <p className="text-sm text-gray-500">
                    Posted on: {new Date(viewNews.createdAt).toLocaleString()}
                  </p>
                </div>
                
                {viewNews.image && (
                  <img
                    src={viewNews.image}
                    alt="News cover"
                    className="w-full h-64 object-cover rounded-xl mb-6"
                  />
                )}
                
                <div
                  className="prose max-w-none mb-6"
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
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {getIcon()}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
              <p className="text-gray-600 mt-1">
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