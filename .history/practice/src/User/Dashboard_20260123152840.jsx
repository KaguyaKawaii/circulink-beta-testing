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
    
    // For rejected, expired, cancelled, or completed reservations, only show if created within last 24 hours
    if (reservation.status === "Rejected" || reservation.status === "Expired" || reservation.status === "Cancelled" || reservation.status === "Completed") {
      const relevantDate = new Date(reservation.statusUpdatedAt || reservation.createdAt);
      return relevantDate > twentyFourHoursAgo;
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

  // Fetch announcements
  const fetchAnnouncements = useCallback(async () => {
    try {
      console.log("Fetching announcements from:", `${ANNOUNCEMENTS_ENDPOINT}/active`);
      
      const { data } = await axios.get(`${ANNOUNCEMENTS_ENDPOINT}/active`);
      console.log("Active announcements response:", data);
      
      let activeAnnouncements = [];
      
      if (data.announcements && Array.isArray(data.announcements)) {
        activeAnnouncements = data.announcements.filter(announcement => 
          announcement.isActive !== false && 
          new Date(announcement.endDate) >= new Date()
        );
      } else if (Array.isArray(data)) {
        activeAnnouncements = data.filter(announcement => 
          announcement.isActive !== false && 
          new Date(announcement.endDate) >= new Date()
        );
      } else if (data.success && Array.isArray(data.data)) {
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
      
      try {
        console.log("Trying fallback to regular announcements endpoint");
        const { data } = await axios.get(ANNOUNCEMENTS_ENDPOINT);
        console.log("Regular announcements response:", data);
        
        let activeAnnouncements = [];
        const now = new Date();
        
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

        setRoomStatuses(
          Array.isArray(data)
            ? data.map((r) => ({
                floor: r.floor || "Unknown Floor",
                room: r.room || "Unnamed Room",
                isActive: r.isActive !== false,
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

      setRoomStatuses(
        Array.isArray(data)
          ? data.map((r) => ({
              floor: r.floor || "Unknown Floor",
              room: r.room || "Unnamed Room",
              isActive: r.isActive !== false,
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
          isToday ? "bg-gradient-to-br from-yellow-400/30 to-yellow-500/20 rounded-full" : ""
        } ${hasRes ? "bg-gradient-to-br from-green-500/20 to-green-600/10" : ""}`}
        aria-label={`${date.getDate()} ${isToday ? "Today" : ""} ${hasRes ? "Has reservation" : ""}`}
      >
        {date.getDate()}
      </div>
    );
  };

  // Status color mapping
  const getStatusColor = (status) => {
    const statusColors = {
      'Approved': 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border border-green-200',
      'Pending': 'bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-800 border border-yellow-200',
      'Rejected': 'bg-gradient-to-r from-red-50 to-red-100 text-red-800 border border-red-200',
      'Cancelled': 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200',
      'Expired': 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-500 border border-gray-300',
      'Ongoing': 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200',
      'Completed': 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border border-purple-200',
    };
    return statusColors[status] || 'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-600 border border-gray-200';
  };

  // Get current reservations for pagination
  const indexOfLastReservation = currentReservationPage * reservationsPerPage;
  const indexOfFirstReservation = indexOfLastReservation - reservationsPerPage;
  const currentReservations = filteredReservations.slice(indexOfFirstReservation, indexOfLastReservation);
  const totalPages = Math.ceil(filteredReservations.length / reservationsPerPage);

  // Change page
  const paginate = (pageNumber) => setCurrentReservationPage(pageNumber);

  return (
    <main className="w-full md:ml-[250px] md:w-[calc(100%-250px)] min-h-screen flex flex-col bg-gradient-to-b from-[#FFFCFB] to-gray-50">
      {/* HEADER */}
      <header className="bg-white text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-red-600 to-red-700 rounded-full"></div>
          <h1 className="text-xl md:text-2xl font-bold tracking-wide text-gray-800">Dashboard</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Welcome, {user?.name?.split(' ')[0] || "User"}</span>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col xl:flex-row gap-4 sm:gap-6">
        {/* LEFT COLUMN */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-6">
          {/* Welcome banner */}
          <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 shadow-xl rounded-2xl w-full h-32 sm:h-40 flex flex-col items-center justify-center text-center text-white p-4 sm:p-6 relative overflow-hidden group">
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5"></div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-white/10 rounded-full translate-x-1/3 translate-y-1/3 group-hover:scale-110 transition-transform duration-700"></div>
            
            {/* Content */}
            <div className="relative z-10 transform transition-all duration-300 group-hover:scale-105">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 drop-shadow-lg">
                Welcome back, {user?.name || "User"}! 👋
              </h1>
              <p className="text-red-100 text-sm sm:text-base font-medium">
                Manage your room reservations and stay updated
              </p>
            </div>
            
            {/* Decorative corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/30 rounded-tl-xl"></div>
            <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/30 rounded-tr-xl"></div>
            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/30 rounded-bl-xl"></div>
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/30 rounded-br-xl"></div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex w-full max-w-xs sm:max-w-sm justify-between bg-white shadow-lg p-1.5 rounded-3xl border border-gray-100">
            <button
              onClick={() => setView("dashboard")}
              className={`px-4 sm:px-5 py-2.5 rounded-3xl font-semibold transition-all duration-300 text-sm sm:text-base flex-1 ${
                "dashboard" === "dashboard" 
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg transform scale-105" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              Dashboard
            </button>

            <button
              onClick={() => setView("news")}
              className={`px-4 sm:px-5 py-2.5 rounded-3xl font-semibold transition-all duration-300 cursor-pointer text-sm sm:text-base flex-1 ${
                "dashboard" === "news" 
                  ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg transform scale-105" 
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              News
            </button>
          </div>

          {/* User Reservations */}
          <div className="bg-white border border-gray-200/80 shadow-xl rounded-2xl flex-1 p-4 sm:p-6 flex flex-col h-full transition-all duration-300 hover:shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-800">Your Reservations</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{filteredReservations.length} total reservations</p>
                </div>
              </div>

              {/* Pagination controls */}
              {filteredReservations.length > reservationsPerPage && (
                <div className="flex items-center bg-gray-50 rounded-xl p-1.5">
                  <button
                    onClick={() => paginate(currentReservationPage - 1)}
                    disabled={currentReservationPage === 1}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ${
                      currentReservationPage === 1
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 cursor-pointer shadow-sm"
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

                  <div className="mx-2 flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((number) => (
                      <button
                        key={number}
                        onClick={() => paginate(number)}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-300 ${
                          currentReservationPage === number
                            ? "bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md cursor-pointer"
                            : "bg-white text-gray-600 hover:bg-gray-100 cursor-pointer"
                        }`}
                        aria-label={`Go to page ${number}`}
                      >
                        {number}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => paginate(currentReservationPage + 1)}
                    disabled={currentReservationPage === totalPages}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-300 ${
                      currentReservationPage === totalPages
                        ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-700 hover:bg-red-50 hover:text-red-600 cursor-pointer shadow-sm"
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
            
            <div className="border-b border-gray-100 mb-6"></div>
            
            {isLoading ? (
              <div className="flex flex-col justify-center items-center h-full space-y-4 py-12">
                <div className="relative">
                  <div className="w-14 h-14 border-4 border-gray-100 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-14 h-14 border-4 border-transparent border-t-red-500 border-l-red-500 rounded-full animate-spin"></div>
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full"></div>
                </div>
                <div className="text-center">
                  <span className="text-sm font-medium text-gray-600 animate-pulse">Loading reservations...</span>
                  <p className="text-xs text-gray-400 mt-1">This will only take a moment</p>
                </div>
              </div>
            ) : filteredReservations.length > 0 ? (
              <div className="flex-1">
                {currentReservations.map((reservation) => (
                  <section
                    key={reservation._id}
                    className="border border-gray-200 rounded-2xl p-5 bg-white shadow-lg hover:shadow-2xl transition-all duration-500 flex flex-col h-full mb-5 group hover:border-gray-300"
                  >
                    {/* Header with status */}
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-400 to-green-500 animate-pulse"></div>
                          <h3 className="text-lg sm:text-xl font-bold text-gray-800 group-hover:text-gray-900 transition-colors">
                            {reservation.roomName}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600">{reservation.location}</p>
                      </div>
                      <span
                        className={`px-4 py-2 w-full sm:w-auto text-center rounded-xl text-sm font-semibold transition-all duration-300 shadow-sm ${getStatusColor(reservation.status)}`}
                      >
                        {reservation.status}
                      </span>
                    </div>
                    
                    {/* Details grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Date & Time</p>
                            <p className="text-sm text-gray-800 font-semibold">
                              {new Date(reservation.datetime).toLocaleDateString("en-PH", {
                                timeZone: "Asia/Manila",
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 ml-13">
                          {new Date(reservation.datetime).toLocaleTimeString("en-PH", {
                            timeZone: "Asia/Manila",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })} - {' '}
                          {new Date(reservation.endDatetime).toLocaleTimeString("en-PH", {
                            timeZone: "Asia/Manila",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-gray-50 to-white p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 font-medium">Purpose</p>
                            <p className="text-sm text-gray-800 font-semibold truncate">{reservation.purpose}</p>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 ml-13 line-clamp-2">{reservation.purpose}</p>
                      </div>
                    </div>

                    {/* Participants */}
                    {reservation.participants && reservation.participants.length > 0 && (
                      <div className="mb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          <p className="font-medium text-gray-700">Participants ({reservation.participants.length})</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {reservation.participants.slice(0, 4).map((participant, index) => (
                            <div 
                              key={index} 
                              className="flex items-center bg-gradient-to-r from-gray-50 to-white px-3 py-2 rounded-lg text-sm border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all duration-200"
                            >
                              <span className="w-8 h-8 rounded-full bg-gradient-to-r from-red-500 to-red-600 flex items-center justify-center text-xs text-white font-medium mr-2">
                                {participant.name?.charAt(0) || participant.email?.charAt(0) || "U"}
                              </span>
                              <span className="truncate text-gray-800 max-w-[120px]">
                                {participant.name || participant.email}
                              </span>
                            </div>
                          ))}
                          {reservation.participants.length > 4 && (
                            <div className="flex items-center px-3 py-2 rounded-lg text-sm border border-dashed border-gray-300 text-gray-500">
                              +{reservation.participants.length - 4} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-auto pt-4 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="text-xs text-gray-500 flex items-center gap-2">
                          <div className="flex items-center gap-1.5">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" />
                            </svg>
                            <span>Submitted: {formatPH(reservation.createdAt)}</span>
                          </div>
                        </div>
                        <button
                          className="group inline-flex items-center gap-2 text-red-600 hover:text-red-800 font-medium px-4 py-2.5 rounded-lg hover:bg-red-50 transition-all duration-300 cursor-pointer"
                          onClick={() => {
                            setSelectedReservation?.(reservation);
                            setView?.("reservationDetails");
                          }}
                          aria-label={`View details for ${reservation.roomName} reservation`}
                        >
                          <span>View Details</span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                      
                      {/* Info note */}
                      <div className="mt-3 bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-600 flex items-start gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-gray-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span><strong>Note:</strong> Rejected, expired, and completed reservations will only remain visible here for 24 hours.</span>
                        </p>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 sm:py-12 flex flex-col justify-center items-center h-full">
                <div className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-2xl border border-gray-200 max-w-md shadow-lg">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">No reservations yet</h3>
                  <p className="text-gray-600 text-sm mb-6">
                    You don't have any active reservations. Start by booking a room for your next meeting or event.
                  </p>
                  <button 
                    onClick={handleReserveClick}
                    className="group inline-flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-3 rounded-xl font-medium hover:from-red-600 hover:to-red-700 transition-all duration-300 shadow-lg hover:shadow-xl cursor-pointer transform hover:-translate-y-0.5"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Calendar</h2>
                <p className="text-xs text-gray-500">Click on a date to check availability</p>
              </div>
            </div>
           
            <Calendar
              onClickDay={handleDateClick}
              value={selectedDate}
              className="border-0 w-full bg-transparent"
              tileContent={renderCalendarTile}
              tileClassName={({ date, view }) => {
                if (view !== "month") return "";
                return "relative h-10 sm:h-12 hover:bg-gray-50 rounded-xl transition-all duration-200 cursor-pointer";
              }}
              prevLabel={<span className="text-gray-600 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-gray-100">◀</span>}
              nextLabel={<span className="text-gray-600 hover:text-red-600 transition-colors p-2 rounded-lg hover:bg-gray-100">▶</span>}
              prev2Label={null}
              next2Label={null}
              aria-label="Reservation calendar"
              calendarType="gregory"
              formatShortWeekday={(locale, date) => {
                const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                return days[date.getDay()];
              }}
              navigationLabel={({ date }) => (
                <span className="text-gray-800 font-semibold">
                  {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              )}
            />
            
            <div className="mt-6 pt-5 border-t border-gray-100">
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 mr-2"></div>
                  <span className="text-xs text-gray-600 font-medium">Today</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 mr-2"></div>
                  <span className="text-xs text-gray-600 font-medium">Reserved</span>
                </div>
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-gray-300 to-gray-400 mr-2"></div>
                  <span className="text-xs text-gray-600 font-medium">Available</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reserve Room Button */}
          <div className="relative group">
            <button
              className={`relative overflow-hidden rounded-2xl w-full h-28 sm:h-36 flex items-center justify-center transition-all duration-500 shadow-xl ${
                activeRes?.dayReservationCount >= 2
                  ? "bg-gradient-to-r from-gray-300 to-gray-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-700 hover:to-red-800 cursor-pointer focus:outline-none focus:ring-4 focus:ring-red-300/50"
              } transform hover:-translate-y-1`}
              onClick={handleReserveClick}
              disabled={activeRes?.dayReservationCount >= 2}
              aria-label={
                activeRes?.dayReservationCount >= 2
                  ? "Reservation limit reached"
                  : "Reserve a room"
              }
            >
              {/* Animated background effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>

              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12 transform translate-x-[-100%] group-hover:translate-x-[100%] transition-all duration-1000"></div>

              {/* Content */}
              <div className="flex flex-col justify-center items-center text-white relative z-10 transition-all duration-300">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-7 w-7 sm:h-8 sm:w-8 drop-shadow-lg"
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
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-wide mb-1 drop-shadow-md">
                  {hasActiveRes ? "Reservation Active" : "Reserve Room"}
                </h2>
                {activeRes?.dayReservationCount >= 2 ? (
                  <p className="text-sm font-medium text-white/90">
                    Daily limit reached (2 reservations)
                  </p>
                ) : hasActiveRes ? (
                  <p className="text-sm font-medium text-white/90">
                    Check your current reservation
                  </p>
                ) : (
                  <p className="text-sm font-medium text-white/90">
                    Tap to create a reservation
                  </p>
                )}
              </div>
              
              {/* Corner accents */}
              <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-white/30"></div>
              <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-white/30"></div>
              <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-white/30"></div>
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-white/30"></div>
            </button>
            
            {/* Status indicator */}
            <div className="absolute -top-2 -right-2">
              {hasActiveRes ? (
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : activeRes?.dayReservationCount >= 2 ? (
                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-gray-500 to-gray-600 flex items-center justify-center shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              ) : null}
            </div>
          </div>

          {/* Announcements Section */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-5 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 13.9999L5.57465 20.2985C5.61893 20.4756 5.64107 20.5642 5.66727 20.6415C5.92317 21.397 6.60352 21.9282 7.39852 21.9933C7.4799 21.9999 7.5712 21.9999 7.75379 21.9999C7.98244 21.9999 8.09677 21.9999 8.19308 21.9906C9.145 21.8982 9.89834 21.1449 9.99066 20.193C10 20.0967 10 19.9823 10 19.7537V5.49991M18.5 13.4999C20.433 13.4999 22 11.9329 22 9.99991C22 8.06691 20.433 6.49991 18.5 6.49991M10.25 5.49991H6.5C4.01472 5.49991 2 7.51463 2 9.99991C2 12.4852 4.01472 14.4999 6.5 14.4999H10.25C12.0164 14.4999 14.1772 15.4468 15.8443 16.3556C16.8168 16.8857 17.3031 17.1508 17.6216 17.1118C17.9169 17.0756 18.1402 16.943 18.3133 16.701C18.5 16.4401 18.5 15.9179 18.5 14.8736V5.1262C18.5 4.08191 18.5 3.55976 18.3133 3.2988C18.1402 3.05681 17.9169 2.92421 17.6216 2.88804C17.3031 2.84903 16.8168 3.11411 15.8443 3.64427C14.1772 4.55302 12.0164 5.49991 10.25 5.49991Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Announcements</h2>
                <p className="text-xs text-gray-500">Important updates and notices</p>
              </div>
              {announcements.length > 0 && (
                <div className="ml-auto">
                  <span className="bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                    {announcements.length} new
                  </span>
                </div>
              )}
            </div>
            
            <div className="space-y-0 max-h-80 overflow-y-auto pr-1">
              {announcements.length > 0 ? (
                announcements.slice(0, 4).map((announcement, index) => (
                  <div
                    key={announcement._id}
                    className="group flex items-center gap-3 cursor-pointer hover:bg-gradient-to-r from-gray-50 to-white transition-all duration-200 border-b border-gray-100 last:border-b-0 px-4 py-4 rounded-xl hover:shadow-lg hover:border-transparent"
                    onClick={() => handleAnnouncementClick(announcement, index)}
                  >
                    {/* Priority indicator */}
                    <div className={`w-2 h-2 rounded-full ${
                      announcement.priority === 'high' ? 'bg-red-500 animate-pulse' :
                      announcement.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}></div>

                    {/* Announcement content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm mb-1 truncate group-hover:text-gray-900">
                        {announcement.title}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {announcement.description || "No description available"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">
                          {new Date(announcement.createdAt).toLocaleDateString('en-PH', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                        {announcement.priority === 'high' && (
                          <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded">High Priority</span>
                        )}
                      </div>
                    </div>
                    
                    {/* Chevron icon */}
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-3">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm mb-2">No active announcements</p>
                  <p className="text-gray-400 text-xs">Check back later for updates</p>
                </div>
              )}
            </div>
            
            {announcements.length > 4 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button 
                  onClick={() => handleAnnouncementClick(announcements[0], 0)}
                  className="w-full text-center text-sm text-red-600 hover:text-red-800 font-medium py-2 rounded-lg hover:bg-red-50 transition-colors duration-300"
                >
                  View all announcements ({announcements.length})
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
      
      {/* Footer */}
      <footer className="mt-auto bg-white border-t border-gray-200">
        <div className="px-4 sm:px-5 py-4 sm:py-3 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-0">
          {/* Copyright */}
          <div className="text-xs sm:text-sm text-gray-500 order-2 sm:order-1 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
              <span className="text-red-600 font-bold text-xs">US</span>
            </div>
            <div>
              <span className="font-medium text-gray-700">USA-FLD CircuLink</span>
              <span className="text-gray-400 mx-2">•</span>
              © {new Date().getFullYear()} All rights reserved
            </div>
          </div>

          {/* Report Button */}
          <button
            onClick={() => setShowReportModal(true)}
            className="group inline-flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-800 transition-all duration-300 cursor-pointer order-1 sm:order-2 px-4 py-2 rounded-lg hover:bg-red-50"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
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
            </div>
            <div className="text-left">
              <span className="block">Report a Problem</span>
              <span className="text-xs text-gray-500 group-hover:text-gray-600">Found an issue? Let us know</span>
            </div>
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