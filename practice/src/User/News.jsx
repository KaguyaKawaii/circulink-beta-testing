import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import ReportProblemModal from "./Modals/ReportProblemModal";


function News({ user, setView }) {
  const [newsList, setNewsList] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);


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
      console.log("Fetched news data:", data); // Debug log
      const newsData = Array.isArray(data) ? data : data.news || [];
      setNewsList(newsData);
      
      // Debug each news item's images
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
    console.log("Processing image:", img); // Debug log
    
    if (!img) {
      console.log("No image provided");
      return null;
    }
    
    // If it's already a full URL (http:// or https://) including Cloudinary
    if (img.startsWith("http://") || img.startsWith("https://")) {
      console.log("Image is already a full URL");
      return img;
    }
    
    // If it's a Cloudinary path (starts with cloudinary:// or has cloudinary in it)
    if (img.includes("cloudinary") || img.includes("res.cloudinary.com")) {
      // Check if it needs to be converted to a proper URL
      if (img.startsWith("cloudinary://")) {
        // Extract Cloudinary components and construct URL
        // This depends on how your backend stores Cloudinary URLs
        console.log("Cloudinary URL needs processing:", img);
        // You might need to adjust this based on your actual Cloudinary URL format
        return `https://res.cloudinary.com/${img.split('cloudinary://')[1]}`;
      }
      // If it's already a partial Cloudinary URL, prepend https://
      if (img.startsWith("//") || img.startsWith("/")) {
        return `https:${img}`;
      }
      return img;
    }
    
    // Fallback: assume it's a relative path to your API
    console.log("Treating as relative path");
    const baseUrl = import.meta.env.VITE_API_URL;
    const cleanedPath = img.replace(/^\/+/, ""); // Remove leading slashes
    const url = `${baseUrl}/${cleanedPath}`;
    console.log("Constructed URL:", url);
    return url;
  };

  const handleImageClick = (imageUrl, index) => {
    console.log("Image clicked:", imageUrl, "Index:", index);
    const fullUrl = getImageUrl(imageUrl);
    setSelectedImage(fullUrl);
    setSelectedImageIndex(index);
  };

  const handlePrevImage = (images) => {
    if (selectedImageIndex > 0) {
      const newIndex = selectedImageIndex - 1;
      setSelectedImageIndex(newIndex);
      const fullUrl = getImageUrl(images[newIndex]);
      setSelectedImage(fullUrl);
    }
  };

  const handleNextImage = (images) => {
    if (selectedImageIndex < images.length - 1) {
      const newIndex = selectedImageIndex + 1;
      setSelectedImageIndex(newIndex);
      const fullUrl = getImageUrl(images[newIndex]);
      setSelectedImage(fullUrl);
    }
  };

  // Helper to extract image filename for comparison
  const getImageFilename = (url) => {
    if (!url) return '';
    return url.split('/').pop();
  };

  return (
    <main className="w-full md:ml-[250px] md:w-[calc(100%-250px)] min-h-screen flex flex-col bg-[#FFFCFB]">
      {/* Header */}
      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">News</h1>
      </header>

      {/* Tab Switcher */}
      <div className="flex w-full max-w-[200px] justify-between bg-white shadow-md p-1 rounded-3xl mt-4 sm:mt-6 ml-4 sm:ml-6 mx-4 sm:mx-0">
        <button
          onClick={() => setView("dashboard")}
          className={`px-3 sm:px-4 py-2 rounded-3xl font-semibold transition-all duration-300 text-sm sm:text-base cursor-pointer ${
            "news" === "dashboard" 
              ? "bg-red-600 text-white" 
              : "text-gray-700 hover:bg-gray-200"
          }`}
        >
          Dashboard
        </button>

        <button
          onClick={() => setView("news")}
          className={`px-3 sm:px-4 py-2 rounded-3xl font-semibold transition-all duration-300 cursor-pointer text-sm sm:text-base ${
            "news" === "news" 
              ? "bg-red-600 text-white" 
              : "text-gray-700 hover:bg-gray-200"
          }`}
        >
          News
        </button>
      </div>

      {/* News Content */}
      <div className="flex justify-center p-3 sm:p-4 md:p-6">
        <div className="space-y-4 max-h-[calc(100vh-200px)] pr-2 w-full max-w-6xl">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading news...</div>
          ) : !newsList || newsList.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No announcements available at this time.</p>
            </div>
          ) : (
            newsList.map((n) => {
              // Handle both single image (n.image) and multiple images (n.images)
              const images = n.images || (n.image ? [n.image] : []);
              
              return (
                <article
                  key={n._id}
                  className="p-3 sm:p-4 border border-gray-100 rounded-lg hover:shadow transition-shadow bg-white"
                >
                  <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-3">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 md:mb-0">
                      {/* Circle with Admin SVG */}
                      <div className="flex items-center justify-center border border-gray-500 rounded-full w-[40px] h-[40px] sm:w-[50px] sm:h-[50px] bg-yellow-300">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700"
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
                      <h1 className="font-bold text-sm sm:text-base">USA-FLD Admin</h1>
                    </div>
                    <time className="text-xs text-gray-500 flex items-center gap-1 mt-1 sm:mt-0">
                      {formatPH(n.createdAt)}
                    </time>
                  </div>

                  {/* Show Images */}
                  {images.length > 0 && (
                    <div className="mb-3">
                      {images.length === 1 ? (
                        // Single image
                        <img
                          src={getImageUrl(images[0])}
                          alt={n.title}
                          className="w-full rounded-lg object-contain cursor-pointer"
                          style={{ maxHeight: "600px" }}
                          onError={(e) => {
                            console.error("Image failed to load:", images[0]);
                            e.target.style.display = 'none';
                          }}
                          onClick={() => handleImageClick(images[0], 0)}
                        />
                      ) : (
                        // Multiple images - grid layout
                        <div className={`grid gap-2 ${images.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                          {images.slice(0, 3).map((img, index) => (
                            <div key={index} className="relative">
                              <img
                                src={getImageUrl(img)}
                                alt={`${n.title} - ${index + 1}`}
                                className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onError={(e) => {
                                  console.error("Image failed to load:", img);
                                  e.target.style.display = 'none';
                                }}
                                onClick={() => handleImageClick(img, index)}
                              />
                              {images.length > 3 && index === 2 && (
                                <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                  <span className="text-white font-bold text-lg">
                                    +{images.length - 3}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {images.length > 1 && (
                        <p className="text-xs text-gray-500 mt-2 text-center">
                          Click on any image to view full size ({images.length} images)
                        </p>
                      )}
                    </div>
                  )}

                  <div className="border-b border-gray-100 mb-3" />
                  <h2 className="font-bold text-gray-800 text-base sm:text-lg">{n.title}</h2>
                  <div
                    className="text-sm text-gray-600"
                    dangerouslySetInnerHTML={{ __html: n.content }}
                  />
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Fullscreen Image Modal with Navigation */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setSelectedImage(null);
            setSelectedImageIndex(0);
          }}
        >
          <div 
            className="relative max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImage}
              alt="Full view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
              onError={(e) => {
                console.error("Fullscreen image failed to load:", selectedImage);
                e.target.style.display = 'none';
              }}
            />
            
            {/* Close button */}
            <button
              className="absolute top-4 right-4 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 transition-colors cursor-pointer"
              onClick={() => {
                setSelectedImage(null);
                setSelectedImageIndex(0);
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Find the current news item to get all images */}
            {newsList.map((newsItem) => {
              const itemImages = newsItem.images || (newsItem.image ? [newsItem.image] : []);
              
              // Check if selected image belongs to this news item
              const currentImageUrl = getImageUrl(itemImages[selectedImageIndex]);
              const isCurrentItem = currentImageUrl === selectedImage || 
                                   getImageFilename(currentImageUrl) === getImageFilename(selectedImage);
              
              if (isCurrentItem && itemImages.length > 1) {
                return (
                  <>
                    {/* Previous button */}
                    {selectedImageIndex > 0 && (
                      <button
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors cursor-pointer"
                        onClick={() => handlePrevImage(itemImages)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                    )}

                    {/* Next button */}
                    {selectedImageIndex < itemImages.length - 1 && (
                      <button
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors cursor-pointer"
                        onClick={() => handleNextImage(itemImages)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    )}

                    {/* Image counter */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                      {selectedImageIndex + 1} / {itemImages.length}
                    </div>
                  </>
                );
              }
              return null;
            })}
          </div>
          {/* Footer */}
      <footer className="mt-auto bg-white border-t border-gray-200">
        <div className="px-4 sm:px-5 py-3 sm:py-2 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
          {/* Copyright */}
          <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1 flex items-center gap-1">
            
            © {new Date().getFullYear()} <span className="font-semibold">USA-FLD CircuLink</span>
          </div>

          {/* Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-1 text-xs sm:text-sm font-medium text-red-600 hover:text-red-800 transition-all duration-300 cursor-pointer order-1 sm:order-2 hover:gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 sm:h-4 sm:w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Report Problem
          </button>
        </div>
      </footer>

      {/* Modal Components */}
      {showReportModal && (
        <ReportProblemModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          user={user}
        />
      )}
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