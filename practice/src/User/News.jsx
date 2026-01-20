import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";

function News({ user, setView }) {
  const [newsList, setNewsList] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [activeNews, setActiveNews] = useState(null);

  const NEWS_ENDPOINT = `${import.meta.env.VITE_API_URL}/api/news/active`;

  const formatPH = (date) => {
    if (!date) return "N/A";
    try {
      return new Date(date).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      return "Invalid date";
    }
  };

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get(NEWS_ENDPOINT);
      console.log("Fetched news data:", data);
      const newsData = Array.isArray(data) ? data : data.news || [];
      setNewsList(newsData);
      
      newsData.forEach((item, index) => {
        console.log(`News ${index}:`, {
          title: item.title,
          images: item.images,
          imageCount: item.images?.length || 0,
          hasImageField: !!item.image,
          imageField: item.image
        });
      });
    } catch (error) {
      console.error("Failed to fetch news:", error);
      setNewsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const getImageUrl = (img) => {
    console.log("Processing image:", img);
    
    if (!img) {
      console.log("No image provided");
      return null;
    }
    
    if (img.startsWith("http://") || img.startsWith("https://")) {
      console.log("Image is already a full URL");
      return img;
    }
    
    if (img.includes("cloudinary") || img.includes("res.cloudinary.com")) {
      if (img.startsWith("cloudinary://")) {
        console.log("Cloudinary URL needs processing:", img);
        return `https://res.cloudinary.com/${img.split('cloudinary://')[1]}`;
      }
      if (img.startsWith("//") || img.startsWith("/")) {
        return `https:${img}`;
      }
      return img;
    }
    
    console.log("Treating as relative path");
    const baseUrl = import.meta.env.VITE_API_URL;
    const cleanedPath = img.replace(/^\/+/, "");
    const url = `${baseUrl}/${cleanedPath}`;
    console.log("Constructed URL:", url);
    return url;
  };

  const handleImageClick = (imageUrl, index, newsItem) => {
    console.log("Image clicked:", imageUrl, "Index:", index);
    const fullUrl = getImageUrl(imageUrl);
    setSelectedImage(fullUrl);
    setSelectedImageIndex(index);
    setActiveNews(newsItem);
  };

  const handlePrevImage = () => {
    if (!activeNews) return;
    const images = activeNews.images || (activeNews.image ? [activeNews.image] : []);
    if (selectedImageIndex > 0) {
      const newIndex = selectedImageIndex - 1;
      setSelectedImageIndex(newIndex);
      const fullUrl = getImageUrl(images[newIndex]);
      setSelectedImage(fullUrl);
    }
  };

  const handleNextImage = () => {
    if (!activeNews) return;
    const images = activeNews.images || (activeNews.image ? [activeNews.image] : []);
    if (selectedImageIndex < images.length - 1) {
      const newIndex = selectedImageIndex + 1;
      setSelectedImageIndex(newIndex);
      const fullUrl = getImageUrl(images[newIndex]);
      setSelectedImage(fullUrl);
    }
  };

  const getImageFilename = (url) => {
    if (!url) return '';
    return url.split('/').pop();
  };

  return (
    <main className="w-full md:ml-[250px] md:w-[calc(100%-250px)] min-h-screen bg-[#FFFCFB]">
      {/* Header - Keep original size and color */}
      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">News</h1>
      </header>

      {/* Main Content */}
      <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
        {/* Tab Switcher - Improved styling */}
        <div className="mb-8">
          <div className="inline-flex bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setView("dashboard")}
              className={`px-5 py-3 font-medium text-sm sm:text-base transition-all duration-300 cursor-pointer ${
                "news" === "dashboard" 
                  ? "bg-red-600 text-white" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setView("news")}
              className={`px-5 py-3 font-medium text-sm sm:text-base transition-all duration-300 cursor-pointer ${
                "news" === "news" 
                  ? "bg-red-600 text-white" 
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              News
            </button>
          </div>
        </div>

        {/* News Content */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
              <p className="text-gray-500 text-lg">Loading news...</p>
            </div>
          ) : !newsList || newsList.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">No announcements</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                There are no news announcements available at this time. Please check back later.
              </p>
            </div>
          ) : (
            newsList.map((n) => {
              const images = n.images || (n.image ? [n.image] : []);
              
              return (
                <article
                  key={n._id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300"
                >
                  {/* Author & Date Header */}
                  <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-300 to-yellow-400 rounded-full border-2 border-white shadow-sm">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="w-6 h-6 text-gray-800"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5.121 17.804A9.003 9.003 0 0112 15c2.21 0 4.21.804 5.879 2.137M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                            </svg>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-white flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                        <div>
                          <h2 className="font-bold text-gray-900">USA-FLD Admin</h2>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <time>{formatPH(n.createdAt)}</time>
                          </div>
                        </div>
                      </div>
                      {images.length > 0 && (
                        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-full">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{images.length} photo{images.length !== 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">{n.title}</h3>
                    <div
                      className="prose prose-gray max-w-none text-gray-700"
                      dangerouslySetInnerHTML={{ __html: n.content }}
                    />
                  </div>

                  {/* Images Gallery */}
                  {images.length > 0 && (
                    <div className="border-t border-gray-100">
                      <div className="px-6 py-4">
                        {images.length === 1 ? (
                          <div className="relative overflow-hidden rounded-xl bg-gray-50">
                            <img
                              src={getImageUrl(images[0])}
                              alt={n.title}
                              className="w-full h-auto max-h-[500px] object-contain cursor-pointer hover:scale-[1.02] transition-transform duration-300"
                              onError={(e) => {
                                console.error("Image failed to load:", images[0]);
                                e.target.style.display = 'none';
                              }}
                              onClick={() => handleImageClick(images[0], 0, n)}
                            />
                            <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                              View Full Size
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className={`grid gap-3 ${images.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                              {images.slice(0, 3).map((img, index) => (
                                <div 
                                  key={index} 
                                  className="relative overflow-hidden rounded-lg group cursor-pointer"
                                  onClick={() => handleImageClick(img, index, n)}
                                >
                                  <div className="aspect-square bg-gray-100 overflow-hidden">
                                    <img
                                      src={getImageUrl(img)}
                                      alt={`${n.title} - ${index + 1}`}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                      onError={(e) => {
                                        console.error("Image failed to load:", img);
                                        e.target.style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                    <div className="opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                      </svg>
                                    </div>
                                  </div>
                                  {images.length > 3 && index === 2 && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                      <span className="text-white font-bold text-2xl">
                                        +{images.length - 3}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                            {images.length > 1 && (
                              <div className="mt-3 flex items-center justify-center gap-2 text-sm text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                <span>Click on any image to view full size ({images.length} images total)</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center gap-4">
                        <button className="flex items-center gap-2 hover:text-red-600 transition-colors cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                          </svg>
                          <span>Like</span>
                        </button>
                        <button className="flex items-center gap-2 hover:text-red-600 transition-colors cursor-pointer">
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          <span>Comment</span>
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        <span>{images.length > 0 ? `${images.length} views` : 'No views yet'}</span>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {selectedImage && activeNews && (
        <div
          className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50"
          onClick={() => {
            setSelectedImage(null);
            setSelectedImageIndex(0);
            setActiveNews(null);
          }}
        >
          <div 
            className="relative w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Image */}
            <div className="relative max-w-5xl max-h-[85vh]">
              <img
                src={selectedImage}
                alt="Full view"
                className="max-w-full max-h-[85vh] object-contain rounded-lg"
                onError={(e) => {
                  console.error("Fullscreen image failed to load:", selectedImage);
                  e.target.style.display = 'none';
                }}
              />
              
              {/* Image Info */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                <span className="font-medium">{activeNews.title}</span>
              </div>
            </div>

            {/* Close Button */}
            <button
              className="absolute top-6 right-6 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-300 cursor-pointer hover:scale-110"
              onClick={() => {
                setSelectedImage(null);
                setSelectedImageIndex(0);
                setActiveNews(null);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation Buttons */}
            {((activeNews.images?.length || (activeNews.image ? 1 : 0)) > 1) && (
              <>
                {/* Previous Button */}
                <button
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-300 cursor-pointer hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handlePrevImage}
                  disabled={selectedImageIndex === 0}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Next Button */}
                <button
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-300 cursor-pointer hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleNextImage}
                  disabled={selectedImageIndex >= ((activeNews.images?.length || (activeNews.image ? 1 : 0)) - 1)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>

                {/* Image Counter */}
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
                  Image {selectedImageIndex + 1} of {activeNews.images?.length || (activeNews.image ? 1 : 0)}
                </div>

                {/* Download Button */}
                <a
                  href={selectedImage}
                  download
                  className="absolute bottom-6 right-6 bg-black/50 hover:bg-black/70 text-white rounded-full p-3 transition-all duration-300 cursor-pointer hover:scale-110"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </a>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

News.propTypes = {
  user: PropTypes.object,
  setView: PropTypes.func.isRequired,
};

export default News;