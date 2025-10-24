import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import RoomAvailabilityModal from "./RoomAvailabilityModal";
import PropTypes from 'prop-types';
import ReportProblemModal from "./Modals/ReportProblemModal";
import AnnouncementModal from "./Modals/AnnouncementModal";

// Helper functions
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

const getManilaDateString = (dateObj) => {
  try {
    return new Date(dateObj).toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  } catch (error) {
    console.error("Date conversion error:", error);
    return "";
  }
};

const isSameManilaDate = (date1, date2) => {
  return getManilaDateString(date1) === getManilaDateString(date2);
};

// Filter reservations to hide expired, canceled, and completed after 24 hours
const filterReservations = (reservations) => {
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
  
  return reservations.filter(reservation => {
    // Keep approved and pending reservations regardless of time
    if (reservation.status === "Approved" || reservation.status === "Pending") {
      return true;
    }
    
    // For rejected, expired, or completed reservations, only show if created within last 24 hours
    if (reservation.status === "Rejected" || reservation.status === "Expired" || reservation.status === "Completed") {
      const reservationDate = new Date(reservation.createdAt);
      return reservationDate > twentyFourHoursAgo;
    }
    
    // For any other status, show by default
    return true;
  });
};

function Dashboard({ user, setView, setSelectedReservation }) {
  // State management
  const [isLoading, setIsLoading] = useState(true);
  const [allReservations, setAllReservations] = useState([]);
  const [filteredReservations, setFilteredReservations] = useState([]);
  const [newsList, setNewsList] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasActiveRes, setHasActiveRes] = useState(false);
  const [activeRes, setActiveRes] = useState(null);
  const [showBlock, setShowBlock] = useState(false);
  const [showAvailModal, setShowAvailModal] = useState(false);
  const [roomStatuses, setRoomStatuses] = useState([]);
  const [modalDate, setModalDate] = useState(new Date());
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState("");
  const [participantConflict, setParticipantConflict] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [newReservation, setNewReservation] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [currentReservationPage, setCurrentReservationPage] = useState(1);
  const [reservationsPerPage] = useState(1);
  const [announcements, setAnnouncements] = useState([]);
  
  // Announcement modal state
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
  const [allAnnouncements, setAllAnnouncements] = useState([]);
  
const API_BASE_URL = `${import.meta.env.VITE_API_URL}`;
const RESERVATIONS_ENDPOINT = `${API_BASE_URL}/api/reservations`;
const NEWS_ENDPOINT = `${API_BASE_URL}/api/news`;
const ANNOUNCEMENTS_ENDPOINT = `${API_BASE_URL}/api/announcements`;

  // Event listener for new reservations
  useEffect(() => {
    const handleReservationSuccess = (e) => {
      setNewReservation(e.detail);
      setShowSuccessModal(true);
      fetchReservations();
      checkActiveReservation();
    };

    window.addEventListener('reservationSuccess', handleReservationSuccess);
    return () => window.removeEventListener('reservationSuccess', handleReservationSuccess);
  }, []);

  // Fetch user reservations
  const fetchReservations = useCallback(async () => {
    if (!user?._id) return;

    setIsLoading(true);
    try {
      const { data } = await axios.get(`${RESERVATIONS_ENDPOINT}/user/${user._id}`);
      const sorted = data.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
      setAllReservations(sorted);
      
      // Apply filtering
      const filtered = filterReservations(sorted);
      setFilteredReservations(filtered);
      
      if (filtered.length > 0) setSelectedReservation(filtered[0]);

      const active = sorted.find(
        (r) => ["Approved", "Pending"].includes(r.status) && new Date(r.endDatetime) >= new Date()
      );
      setHasActiveRes(!!active);
      setActiveRes(active || null);
    } catch (error) {
      console.error("Failed to fetch reservations:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user, setSelectedReservation, RESERVATIONS_ENDPOINT]);

  // Check active reservations
  const checkActiveReservation = useCallback(async () => {
    if (!user?._id) return;
    try {
      const { data } = await axios.get(`${RESERVATIONS_ENDPOINT}/user/${user._id}`);
      
      if (data) {
        const today = new Date();
        const todayReservations = Array.isArray(data) 
          ? data.filter(r => isSameManilaDate(r.datetime, today))
          : [data].filter(r => isSameManilaDate(r.datetime, today));
        
        setHasActiveRes(todayReservations.length > 0);
        setActiveRes({
          ...(todayReservations[0] || {}),
          dayReservationCount: todayReservations.length
        });
      } else {
        setHasActiveRes(false);
        setActiveRes(null);
      }
    } catch (error) {
      console.error("Failed to check active reservation:", error);
      setHasActiveRes(false);
      setActiveRes(null);
    }
  }, [user, RESERVATIONS_ENDPOINT]);

  // Fetch news
  const fetchNews = useCallback(async () => {
    try {
      const { data } = await axios.get(NEWS_ENDPOINT);
      setNewsList(data);
    } catch (error) {
      console.error("Failed to fetch news:", error);
      setNewsList([]);
    }
  }, [NEWS_ENDPOINT]);

  // Fetch announcements - FIXED VERSION
  const fetchAnnouncements = useCallback(async () => {
    try {
      console.log("Fetching announcements from:", `${ANNOUNCEMENTS_ENDPOINT}/active`);
      
      // Try the active endpoint first
      const { data } = await axios.get(`${ANNOUNCEMENTS_ENDPOINT}/active`);
      console.log("Active announcements response:", data);
      
      let activeAnnouncements = [];
      
      // Handle different response structures
      if (data.announcements && Array.isArray(data.announcements)) {
        // Response has announcements array
        activeAnnouncements = data.announcements.filter(announcement => 
          announcement.isActive !== false && 
          new Date(announcement.endDate) >= new Date()
        );
      } else if (Array.isArray(data)) {
        // Response is directly an array
        activeAnnouncements = data.filter(announcement => 
          announcement.isActive !== false && 
          new Date(announcement.endDate) >= new Date()
        );
      } else if (data.success && Array.isArray(data.data)) {
        // Response has data array
        activeAnnouncements = data.data.filter(announcement => 
          announcement.isActive !== false && 
          new Date(announcement.endDate) >= new Date()
        );
      }
      
      console.log("Filtered active announcements:", activeAnnouncements);
      setAnnouncements(activeAnnouncements);
      setAllAnnouncements(activeAnnouncements);
      
    } catch (error) {
      console.error("Failed to fetch announcements from /active endpoint:", error);
      
      // Fallback: try the regular announcements endpoint
      try {
        console.log("Trying fallback to regular announcements endpoint");
        const { data } = await axios.get(ANNOUNCEMENTS_ENDPOINT);
        console.log("Regular announcements response:", data);
        
        let activeAnnouncements = [];
        const now = new Date();
        
        // Handle different response structures for fallback
        if (data.announcements && Array.isArray(data.announcements)) {
          activeAnnouncements = data.announcements.filter(announcement => 
            announcement.isActive !== false && 
            new Date(announcement.endDate) >= now
          );
        } else if (Array.isArray(data)) {
          activeAnnouncements = data.filter(announcement => 
            announcement.isActive !== false && 
            new Date(announcement.endDate) >= now
          );
        } else if (data.success && Array.isArray(data.data)) {
          activeAnnouncements = data.data.filter(announcement => 
            announcement.isActive !== false && 
            new Date(announcement.endDate) >= now
          );
        }
        
        console.log("Fallback filtered announcements:", activeAnnouncements);
        setAnnouncements(activeAnnouncements);
        setAllAnnouncements(activeAnnouncements);
        
      } catch (fallbackError) {
        console.error("Failed to fetch announcements with fallback:", fallbackError);
        setAnnouncements([]);
        setAllAnnouncements([]);
      }
    }
  }, [ANNOUNCEMENTS_ENDPOINT]);

  // Initial data loading
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchReservations(),
        checkActiveReservation(),
        fetchNews(),
        fetchAnnouncements()
      ]);
    };
    loadData();
  }, [fetchReservations, checkActiveReservation, fetchNews, fetchAnnouncements]);

  // Handle reservation updates
  useEffect(() => {
    const handleNewReservation = () => {
      fetchReservations();
      checkActiveReservation();
    };
    window.addEventListener("reservationSubmitted", handleNewReservation);
    return () => window.removeEventListener("reservationSubmitted", handleNewReservation);
  }, [fetchReservations, checkActiveReservation]);

  // Room availability modal effect
  useEffect(() => {
    if (!showAvailModal || !modalDate) return;

    const fetchAvailability = async () => {
      const manilaDateStr = getManilaDateString(modalDate);
      try {
        const { data } = await axios.get(`${RESERVATIONS_ENDPOINT}/availability`, {
          params: { date: manilaDateStr },
        });

// Replace both instances with this:
setRoomStatuses(
  Array.isArray(data)
    ? data.map((r) => ({
        floor: r.floor || "Unknown Floor",
        room: r.room || "Unnamed Room",
        isActive: r.isActive !== false, // ✅ Add this line
        occupied: Array.isArray(r.occupied) ? r.occupied : [],
      }))
    : []
);

      } catch (error) {
        console.error("Availability fetch error:", error);
        setAvailError("Failed to load availability. Please try again later.");
      }
    };

    const interval = setInterval(fetchAvailability, 10000);
    fetchAvailability();

    return () => clearInterval(interval);
  }, [showAvailModal, modalDate, RESERVATIONS_ENDPOINT]);

  // Update filtered reservations when allReservations changes
  useEffect(() => {
    const filtered = filterReservations(allReservations);
    setFilteredReservations(filtered);
    
    // Reset to first page if filtered results change significantly
    if (filtered.length > 0 && currentReservationPage > Math.ceil(filtered.length / reservationsPerPage)) {
      setCurrentReservationPage(1);
    }
  }, [allReservations, currentReservationPage, reservationsPerPage]);

  // Announcement modal handlers
  const handleAnnouncementClick = (announcement, index) => {
    setSelectedAnnouncement(announcement);
    setCurrentAnnouncementIndex(index);
    setShowAnnouncementModal(true);
  };

  const handleNextAnnouncement = () => {
    if (currentAnnouncementIndex < allAnnouncements.length - 1) {
      const nextIndex = currentAnnouncementIndex + 1;
      setCurrentAnnouncementIndex(nextIndex);
      setSelectedAnnouncement(allAnnouncements[nextIndex]);
    }
  };

  const handleDismissAnnouncement = async (announcementId) => {
    try {
      await axios.post(`${ANNOUNCEMENTS_ENDPOINT}/${announcementId}/dismiss`, {
        userId: user._id
      });
      // Refresh announcements after dismissal
      fetchAnnouncements();
      setShowAnnouncementModal(false);
    } catch (error) {
      console.error("Failed to dismiss announcement:", error);
    }
  };

  const handleCloseAllAnnouncements = () => {
    setShowAnnouncementModal(false);
    setSelectedAnnouncement(null);
    setCurrentAnnouncementIndex(0);
  };

  // Event handlers
  const handleReserveClick = () => {
    if (activeRes?.dayReservationCount >= 2) {
      setShowBlock(true);
    } else {
      setView("reserve");
    }
  };

  const handleDateClick = async (date) => {
    setSelectedDate(date);
    setModalDate(date);
    setAvailLoading(true);
    setAvailError("");
    setShowAvailModal(true);

    try {
      const manilaDateStr = getManilaDateString(date);
      const { data } = await axios.get(`${RESERVATIONS_ENDPOINT}/availability`, {
        params: { date: manilaDateStr },
      });

// Replace both instances with this:
setRoomStatuses(
  Array.isArray(data)
    ? data.map((r) => ({
        floor: r.floor || "Unknown Floor",
        room: r.room || "Unnamed Room",
        isActive: r.isActive !== false, // ✅ Add this line
        occupied: Array.isArray(r.occupied) ? r.occupied : [],
      }))
    : []
);
    } catch (error) {
      console.error("Availability fetch error:", error);
      setAvailError("Failed to load availability. Please try again later.");
    } finally {
      setAvailLoading(false);
    }
  };

  // Calendar tile rendering
  const renderCalendarTile = ({ date, view }) => {
    if (view !== "month") return null;

    const isToday = isSameManilaDate(date, new Date());
    const hasRes = allReservations.some(reservation => 
      isSameManilaDate(new Date(reservation.datetime), date)
    );

    return (
      <div
        className={`absolute inset-0 flex items-center justify-center ${
          isToday ? "bg-yellow-400/20 rounded-full" : ""
        } ${hasRes ? "bg-green-500/10" : ""}`}
        aria-label={`${date.getDate()} ${isToday ? "Today" : ""} ${hasRes ? "Has reservation" : ""}`}
      >
        {date.getDate()}
      </div>
    );
  };

  // Status color mapping
  const getStatusColor = (status) => {
    const statusColors = {
      'Approved': 'bg-green-100 text-green-800 border border-green-200',
      'Pending': 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      'Rejected': 'bg-red-100 text-red-800 border border-red-200',
      'Cancelled': 'bg-gray-100 text-gray-600 border border-gray-200',
      'Expired': 'bg-gray-200 text-gray-500 border border-gray-300',
      'Ongoing': 'bg-blue-100 text-blue-800 border border-blue-200',
      'Completed': 'bg-purple-100 text-purple-800 border border-purple-200',
    };
    return statusColors[status] || 'bg-gray-100 text-gray-600 border border-gray-200';
  };

  // Get current reservations for pagination
  const indexOfLastReservation = currentReservationPage * reservationsPerPage;
  const indexOfFirstReservation = indexOfLastReservation - reservationsPerPage;
  const currentReservations = filteredReservations.slice(indexOfFirstReservation, indexOfLastReservation);
  const totalPages = Math.ceil(filteredReservations.length / reservationsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentReservationPage(pageNumber);

  return (
    <main className="w-full md:ml-[250px] md:w-[calc(100%-250px)] min-h-screen flex flex-col bg-[#FFFCFB]">
      {/* HEADER */}
      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm">
        <h1 className="text-xl md:text-2xl font-bold tracking-wide">Dashboard</h1>
      </header>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col xl:flex-row gap-4 sm:gap-6">
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-red-700 to-red-800 shadow-lg rounded-xl w-full h-32 sm:h-40 flex flex-col items-center justify-center text-center text-white p-4 sm:p-6 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
            
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold relative z-10">Welcome back, {user?.name || "User"}!</h1>
            <p className="text-red-100 mt-1 sm:mt-2 text-sm sm:text-base relative z-10">Manage your room reservations and stay updated</p>
          </div>

          {/* Navigation Tabs */}
          <div className="flex w-[200px] max-w-xs sm:max-w-sm justify-between bg-white shadow-md p-1 rounded-3xl mb-1">
            <button
              onClick={() => setView("dashboard")}
              className={`px-3 sm:px-4 py-2 rounded-3xl font-semibold transition-all duration-300 shadow-lg text-sm sm:text-base ${
                "dashboard" === "dashboard" 
                  ? "bg-red-600 text-white" 
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setView("news")}
              className={`px-3 sm:px-4 py-2 rounded-3xl font-semibold transition-all duration-300 cursor-pointer text-sm sm:text-base ${
                "dashboard" === "news" 
                  ? "bg-red-600 text-white" 
                  : "text-gray-700 hover:bg-gray-200"
              }`}
            >
              News
            </button>
          </div>

          {/* User Reservations */}
          <div className="bg-gradient-to-br from-white to-gray-50 border border-gray-200/75 hover:border-gray-300/75 transition-all duration-300 shadow-lg hover:shadow-xl rounded-2xl flex-1 p-4 sm:p-6 flex flex-col h-full">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Your Reservations
              </h2>

              {/* Pagination controls */}
              {filteredReservations.length > reservationsPerPage && (
                <div className="flex justify-center items-center">
                  <button
                    onClick={() => paginate(currentReservationPage - 1)}
                    disabled={currentReservationPage === 1}
                    className={`font-bold px-2 py-2 mx-1 rounded-full transition-all duration-300 ${
                      currentReservationPage === 1
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                    }`}
                    aria-label="Previous page"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                    <button
                      key={number}
                      onClick={() => paginate(number)}
                      className={`font-semibold px-2 sm:px-3 py-1 mx-1 rounded-full text-sm transition-all duration-300 ${
                        currentReservationPage === number
                          ? "bg-[#E62727] text-white cursor-pointer shadow-md"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                      }`}
                      aria-label={`Go to page ${number}`}
                    >
                      {number}
                    </button>
                  ))}

                  <button
                    onClick={() => paginate(currentReservationPage + 1)}
                    disabled={currentReservationPage === totalPages}
                    className={`font-bold px-2 py-2 mx-1 rounded-full transition-all duration-300 ${
                      currentReservationPage === totalPages
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer"
                    }`}
                    aria-label="Next page"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            <div className="border-b border-gray-200 mb-4 sm:mb-5" />
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-full space-y-4 py-8">
                {/* Enhanced Spinner */}
                <div className="relative flex items-center justify-center">
                  {/* Outer subtle ring */}
                  <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
                  {/* Spinning red gradient ring */}
                  <div className="absolute w-12 h-12 border-4 border-transparent border-t-red-500 border-l-red-500 rounded-full animate-spin"></div>
                  {/* Inner dot */}
                  <div className="absolute w-2 h-2 bg-red-500 rounded-full"></div>
                </div>
                {/* Loading text */}
                <span className="text-sm font-medium text-gray-600 animate-pulse">
                  Loading, please wait...
                </span>
              </div>
            ) : filteredReservations.length > 0 ? (
              <div className="flex-1">
                {currentReservations.map((reservation) => (
                  <section
                    key={reservation._id}
                    className="border border-gray-200 rounded-xl p-4 sm:p-5 bg-white shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col h-full mb-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 gap-2">
                      <h3 className="text-base sm:text-lg font-bold text-gray-800 flex items-center gap-2">
                        
                        {reservation.roomName}
                      </h3>
                      <span
                        className={`px-3 py-2 w-full sm:w-auto text-center rounded-full text-sm font-semibold transition-all duration-300 ${getStatusColor(reservation.status)}`}
                      >
                        {reservation.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-700 space-y-3 flex-grow">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="flex items-start gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-600">Location:</p>
                            <p className="text-gray-800">{reservation.location}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="font-medium text-gray-600">Time:</p>
                            <p className="text-gray-800">
                              {formatPH(reservation.datetime)} to {' '}
                              {new Date(reservation.endDatetime).toLocaleTimeString("en-PH", {
                                timeZone: "Asia/Manila",
                                hour: "2-digit",
                                minute: "2-digit",
                                hour12: true,
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-start gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-600">Purpose:</p>
                          <p className="text-gray-800">{reservation.purpose}</p>
                        </div>
                      </div>
                      
                      {reservation.participants && reservation.participants.length > 0 && (
                        <div className="mt-3 sm:mt-4">
                          <div className="flex items-center gap-2 mb-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <p className="font-medium text-gray-600">Participants:</p>
                          </div>
                          <div className="grid grid-cols-1 xs:grid-cols-2 gap-2">
                            {reservation.participants.map((participant, index) => (
                              <div 
                                key={index} 
                                className="flex items-center bg-gray-50 px-3 py-2 rounded-lg text-sm border border-gray-100 hover:bg-gray-100 transition-colors duration-200"
                              >
                                <span className="w-6 h-6 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-xs text-white font-medium mr-2">
                                  {participant.name?.charAt(0) || participant.email?.charAt(0)}
                                </span>
                                <span className="truncate text-gray-800">
                                  {participant.name || participant.email}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center border-t border-gray-100 pt-3 sm:pt-4 mt-3 sm:mt-4 text-sm">
                      <span className="text-gray-500 text-xs sm:text-sm mb-2 sm:mb-0 flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                        </svg>
                        Submitted: {formatPH(reservation.createdAt)}
                      </span>
                      <button
                        className="text-red-600 hover:text-red-800 font-medium flex items-center gap-1 focus:outline-none cursor-pointer text-sm sm:text-base transition-all duration-300 hover:gap-2"
                        onClick={() => {
                          setSelectedReservation?.(reservation);
                          setView?.("reservationDetails");
                        }}
                        aria-label={`View details for ${reservation.roomName} reservation`}
                      >
                        View details
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-gray-500 text-xs mt-2 bg-gray-50 p-2 rounded-lg border border-gray-100">
                      <p className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <strong>Note:</strong> Rejected, expired, and completed reservations will only remain visible here for 24 hours.
                      </p>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8 flex flex-col justify-center items-center h-full">
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200 max-w-md">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-600 text-sm sm:text-base mb-3">
                    “There are no active reservations at the moment.”
                  </p>
                  <button 
                    onClick={handleReserveClick}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white px-4 py-2 rounded-lg font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-md hover:shadow-lg cursor-pointer"
                  >
                    Reserve a Room
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="w-full xl:w-80 flex flex-col gap-4 sm:gap-6">
          {/* Calendar */}
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center gap-2 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <h2 className="text-lg font-bold text-gray-800">Calendar</h2>
            </div>
            <Calendar
              onClickDay={handleDateClick}
              value={selectedDate}
              className="border-0 w-full"
              tileContent={renderCalendarTile}
              tileClassName={({ date, view }) => {
                if (view !== "month") return "";
                return "relative h-10 sm:h-12 hover:bg-gray-50 rounded-lg transition-colors duration-200";
              }}
              prevLabel={<span className="text-gray-600 hover:text-red-600 transition-colors">◀</span>}
              nextLabel={<span className="text-gray-600 hover:text-red-600 transition-colors">▶</span>}
              prev2Label={null}
              next2Label={null}
              aria-label="Reservation calendar"
            />
            <div className="mt-4 flex items-center justify-center space-x-4 flex-wrap gap-2">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-400/20 border border-yellow-400 mr-2"></div>
                <span className="text-xs text-gray-600">Today</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500 mr-2"></div>
                <span className="text-xs text-gray-600">Reserved</span>
              </div>
            </div>
          </div>

          {/* Reserve Room Button */}
          <button
            className={`relative overflow-hidden rounded-2xl w-full h-28 sm:h-36 flex items-center justify-center transition-all duration-300 shadow-lg group ${
              activeRes?.dayReservationCount >= 2
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-opacity-50"
            }`}
            onClick={handleReserveClick}
            disabled={activeRes?.dayReservationCount >= 2}
            aria-label={
              activeRes?.dayReservationCount >= 2
                ? "Reservation limit reached"
                : "Reserve a room"
            }
          >
            {/* Animated background effect */}
            {!activeRes?.dayReservationCount >= 2 && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500"></div>
            )}

            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000"></div>

            <div className="flex flex-col justify-center items-center text-white relative z-10 transition-all duration-300 group-hover:scale-105">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 mb-1 sm:mb-2 drop-shadow-md transition-all duration-300 group-hover:scale-110"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide transition-all duration-300">
                {hasActiveRes ? "Reservation Active" : "Reserve Room"}
              </h2>
              {activeRes?.dayReservationCount >= 2 ? (
                <p className="text-xs sm:text-sm font-medium mt-1 text-white/90 transition-all duration-300">
                  Limit reached (2/day)
                </p>
              ) : hasActiveRes ? (
                <p className="text-xs sm:text-sm font-medium mt-1 text-white/90 transition-all duration-300">
                  Check your current reservation
                </p>
              ) : (
                <p className="text-xs sm:text-sm font-medium mt-1 text-white/90 transition-all duration-300">
                  Tap to create a reservation
                </p>
              )}
            </div>
          </button>

          {/* Announcements Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 13.9999L5.57465 20.2985C5.61893 20.4756 5.64107 20.5642 5.66727 20.6415C5.92317 21.397 6.60352 21.9282 7.39852 21.9933C7.4799 21.9999 7.5712 21.9999 7.75379 21.9999C7.98244 21.9999 8.09677 21.9999 8.19308 21.9906C9.145 21.8982 9.89834 21.1449 9.99066 20.193C10 20.0967 10 19.9823 10 19.7537V5.49991M18.5 13.4999C20.433 13.4999 22 11.9329 22 9.99991C22 8.06691 20.433 6.49991 18.5 6.49991M10.25 5.49991H6.5C4.01472 5.49991 2 7.51463 2 9.99991C2 12.4852 4.01472 14.4999 6.5 14.4999H10.25C12.0164 14.4999 14.1772 15.4468 15.8443 16.3556C16.8168 16.8857 17.3031 17.1508 17.6216 17.1118C17.9169 17.0756 18.1402 16.943 18.3133 16.701C18.5 16.4401 18.5 15.9179 18.5 14.8736V5.1262C18.5 4.08191 18.5 3.55976 18.3133 3.2988C18.1402 3.05681 17.9169 2.92421 17.6216 2.88804C17.3031 2.84903 16.8168 3.11411 15.8443 3.64427C14.1772 4.55302 12.0164 5.49991 10.25 5.49991Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
              </svg>
              <h2 className="text-lg sm:text-xl font-bold text-gray-800">Announcements</h2>
            </div>
            
            <div className="max-h-80 overflow-y-auto space-y-0">
              {announcements.length > 0 ? (
                announcements.slice(0, 4).map((announcement, index) => (
                  <div
                    key={announcement._id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 transition-all duration-200 border-b border-gray-100 last:border-b-0 px-3 py-3 rounded-lg hover:shadow-sm"
                    onClick={() => handleAnnouncementClick(announcement, index)}
                  >
                    {/* Microphone icon */}
                    <svg
                      className="w-4 h-4 text-gray-500 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 13.9999L5.57465 20.2985C5.61893 20.4756 5.64107 20.5642 5.66727 20.6415C5.92317 21.397 6.60352 21.9282 7.39852 21.9933C7.4799 21.9999 7.5712 21.9999 7.75379 21.9999C7.98244 21.9999 8.09677 21.9999 8.19308 21.9906C9.145 21.8982 9.89834 21.1449 9.99066 20.193C10 20.0967 10 19.9823 10 19.7537V5.49991M18.5 13.4999C20.433 13.4999 22 11.9329 22 9.99991C22 8.06691 20.433 6.49991 18.5 6.49991M10.25 5.49991H6.5C4.01472 5.49991 2 7.51463 2 9.99991C2 12.4852 4.01472 14.4999 6.5 14.4999H10.25C12.0164 14.4999 14.1772 15.4468 15.8443 16.3556C16.8168 16.8857 17.3031 17.1508 17.6216 17.1118C17.9169 17.0756 18.1402 16.943 18.3133 16.701C18.5 16.4401 18.5 15.9179 18.5 14.8736V5.1262C18.5 4.08191 18.5 3.55976 18.3133 3.2988C18.1402 3.05681 17.9169 2.92421 17.6216 2.88804C17.3031 2.84903 16.8168 3.11411 15.8443 3.64427C14.1772 4.55302 12.0164 5.49991 10.25 5.49991Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>

                    {/* Announcement title */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm truncate">
                        {announcement.title}
                      </h3>
                    </div>
                    
                    {/* Chevron icon */}
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500 text-sm">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  No active announcements at the moment.
                </div>
              )}
            </div>
          </div>
        </aside>
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

      {/* Announcement Modal */}
      {showAnnouncementModal && (
        <AnnouncementModal
          announcements={allAnnouncements}
          currentAnnouncementIndex={currentAnnouncementIndex}
          onDismiss={handleDismissAnnouncement}
          onNext={handleNextAnnouncement}
          onCloseAll={handleCloseAllAnnouncements}
          showModal={showAnnouncementModal}
        />
      )}

      {/* Room Availability Modal */}
      {showAvailModal && (
        <RoomAvailabilityModal
          selectedDate={modalDate}
          roomStatuses={roomStatuses}
          availLoading={availLoading}
          availError={availError}
          onClose={() => setShowAvailModal(false)}
        />
      )}
    </main>
  );
}

Dashboard.propTypes = {
  user: PropTypes.shape({
    _id: PropTypes.string,
    name: PropTypes.string,
  }),
  setView: PropTypes.func.isRequired,
  setSelectedReservation: PropTypes.func.isRequired,
};

export default Dashboard;