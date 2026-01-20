import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";

function News({ user, setView }) {
  const [newsList, setNewsList] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

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
      setNewsList(Array.isArray(data) ? data : data.news || []);
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
    if (!img) return null;
    return img.startsWith("http")
      ? img
      : `${import.meta.env.VITE_API_URL}${img.replace(/^\/?/, "")}`;
  };

  const handleImageClick = (imageUrl, index) => {
    setSelectedImage(imageUrl);
    setSelectedImageIndex(index);
  };

  const handlePrevImage = (images) => {
    if (selectedImageIndex > 0) {
      const newIndex = selectedImageIndex - 1;
      setSelectedImageIndex(newIndex);
      setSelectedImage(getImageUrl(images[newIndex]));
    }
  };

  const handleNextImage = (images) => {
    if (selectedImageIndex < images.length - 1) {
      const newIndex = selectedImageIndex + 1;
      setSelectedImageIndex(newIndex);
      setSelectedImage(getImageUrl(images[newIndex]));
    }
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
            newsList.map((n) => (
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

                {/* Show Multiple Images */}
                {n.images && n.images.length > 0 && (
                  <div className="mb-3">
                    {n.images.length === 1 ? (
                      // Single image
                      <img
                        src={getImageUrl(n.images[0])}
                        alt={n.title}
                        className="w-full rounded-lg object-contain cursor-pointer"
                        style={{ maxHeight: "600px" }}
                        onClick={() => handleImageClick(n.images[0], 0)}
                      />
                    ) : (
                      // Multiple images - grid layout
                      <div className={`grid gap-2 ${n.images.length <= 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                        {n.images.map((img, index) => (
                          <div key={index} className="relative">
                            <img
                              src={getImageUrl(img)}
                              alt={`${n.title} - ${index + 1}`}
                              className="w-full h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => handleImageClick(img, index)}
                            />
                            {n.images.length > 3 && index === 2 && (
                              <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">
                                  +{n.images.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {n.images.length > 1 && (
                      <p className="text-xs text-gray-500 mt-2 text-center">
                        Click on any image to view full size ({n.images.length} images)
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
            ))
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
              src={getImageUrl(selectedImage)}
              alt="Full view"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
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
              if (newsItem.images && newsItem.images.includes(selectedImage.split('/').pop()) || 
                  newsItem.images?.some(img => getImageUrl(img) === selectedImage)) {
                const currentImages = newsItem.images;
                
                return (
                  currentImages.length > 1 && (
                    <>
                      {/* Previous button */}
                      {selectedImageIndex > 0 && (
                        <button
                          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors cursor-pointer"
                          onClick={() => handlePrevImage(currentImages)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                      )}

                      {/* Next button */}
                      {selectedImageIndex < currentImages.length - 1 && (
                        <button
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 text-white rounded-full p-3 hover:bg-black/70 transition-colors cursor-pointer"
                          onClick={() => handleNextImage(currentImages)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      )}

                      {/* Image counter */}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                        {selectedImageIndex + 1} / {currentImages.length}
                      </div>
                    </>
                  )
                );
              }
              return null;
            })}
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