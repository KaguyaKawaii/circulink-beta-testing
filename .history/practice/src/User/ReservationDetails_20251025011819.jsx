import React, { useState, useEffect } from "react";
import axios from "axios";
import { availableRoomImages } from "../data/roomImages"; // Import from your data folder

function ReservationDetails({ reservation, setView, refreshReservations, user }) {
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showResultModal, setShowResultModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [processingAction, setProcessingAction] = useState("");
  const [conflictInfo, setConflictInfo] = useState(null);
  const [localReservation, setLocalReservation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEndEarlyConfirm, setShowEndEarlyConfirm] = useState(false);
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showApproveExtensionConfirm, setShowApproveExtensionConfirm] = useState(false);
  const [showRejectExtensionConfirm, setShowRejectExtensionConfirm] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);

  // Participant management states
  const [showManageParticipants, setShowManageParticipants] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [processingParticipantAction, setProcessingParticipantAction] = useState("");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [participantToRemove, setParticipantToRemove] = useState(null);
  const [showAddParticipantModal, setShowAddParticipantModal] = useState(false);

  // Load reservation from localStorage on component mount and when reservation prop changes
  useEffect(() => {
    const loadReservation = () => {
      // First try to use the prop if available
      if (reservation) {
        setLocalReservation(reservation);
        // Also save to localStorage for refresh persistence
        localStorage.setItem('selectedReservation', JSON.stringify(reservation));
        setLoading(false);
        return;
      }

      // If no prop, try to load from localStorage
      const savedReservation = localStorage.getItem('selectedReservation');
      if (savedReservation) {
        try {
          setLocalReservation(JSON.parse(savedReservation));
        } catch (error) {
          console.error('Error parsing saved reservation:', error);
          localStorage.removeItem('selectedReservation');
        }
      }
      setLoading(false);
    };

    loadReservation();
  }, [reservation]);

  // Auto-refresh functionality for real-time updates
  useEffect(() => {
    if (!localReservation) return;

    // Set up auto-refresh every 10 seconds for real-time status updates
    const interval = setInterval(() => {
      refreshReservationData();
    }, 10000); // 10 seconds

    setRefreshInterval(interval);

    // Cleanup interval on component unmount
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [localReservation]);

  const refreshReservationData = async () => {
    if (!localReservation?._id) return;

    try {
      const response = await axios.get(`http://localhost:5000/api/reservations/${localReservation._id}`);
      const updatedReservation = response.data;
      
      // Update local state
      setLocalReservation(updatedReservation);
      
      // Update localStorage
      localStorage.setItem('selectedReservation', JSON.stringify(updatedReservation));
      
      // Refresh parent reservations list if available
      if (refreshReservations) {
        refreshReservations();
      }
    } catch (error) {
      console.error('Error refreshing reservation data:', error);
      
      // If we get a 404, the reservation might have been deleted
      if (error.response?.status === 404) {
        setModalMessage("This reservation is no longer available. It may have been deleted.");
        setShowResultModal(true);
        
        // Clear the interval and localStorage
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
        localStorage.removeItem('selectedReservation');
        setLocalReservation(null);
      }
    }
  };

  // Cleanup when reservation becomes invalid
  useEffect(() => {
    if (!localReservation && refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
  }, [localReservation, refreshInterval]);

  // Clear localStorage when component unmounts or when view changes
  useEffect(() => {
    return () => {
      // Only clear if we're navigating away from reservation details
      if (!window.location.pathname.includes('reservation-details')) {
        localStorage.removeItem('selectedReservation');
      }
      // Clear refresh interval
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  // Function to get the appropriate room/floor image based on reservation
  const getRoomImage = () => {
    if (!localReservation) return null;
    
    const { roomName, location } = localReservation;
    
    // If we have a specific room name, try to find exact match first
    if (roomName) {
      const roomImage = availableRoomImages.find(img => 
        img.name.toLowerCase() === roomName.toLowerCase() ||
        roomName.toLowerCase().includes(img.name.toLowerCase()) ||
        img.name.toLowerCase().includes(roomName.toLowerCase())
      );
      
      if (roomImage) return roomImage;
    }
    
    // If no room match found, try to find by location/floor
    if (location) {
      const locationImage = availableRoomImages.find(img => 
        img.name.toLowerCase() === location.toLowerCase() ||
        location.toLowerCase().includes(img.name.toLowerCase()) ||
        img.name.toLowerCase().includes(location.toLowerCase())
      );
      
      if (locationImage) return locationImage;
    }
    
    // Default fallback if no match found
    return availableRoomImages.find(img => img.id === "ground_floor") || availableRoomImages[0];
  };

  const roomImage = getRoomImage();

  const getReservationUserId = () => {
    if (!localReservation || !localReservation.userId) return null;
    return typeof localReservation.userId === 'string' 
      ? localReservation.userId 
      : localReservation.userId._id;
  };

  const reservationUserId = getReservationUserId();
  const isMainReserver = user && reservationUserId === user._id;
  const isStaffOrAdmin = user && (user.role === "Staff" || user.role === "Admin");

  // Participant management functions
  const fetchAvailableUsers = async (search = "") => {
    if (!localReservation) return;
    
    try {
      const response = await axios.get(
        `http://localhost:5000/api/reservations/participants/available-users`,
        {
          params: {
            reservationId: localReservation._id,
            searchTerm: search
          }
        }
      );
      setAvailableUsers(response.data);
    } catch (error) {
      console.error("Error fetching available users:", error);
      setModalMessage("Failed to fetch available users");
      setShowResultModal(true);
    }
  };

  const handleRemoveParticipant = async (participant) => {
    if (!localReservation) return;
    
    setProcessingParticipantAction(`remove-${participant.id_number}`);
    
    try {
      const response = await axios.post(
        `http://localhost:5000/api/reservations/participants/remove`,
        {
          reservationId: localReservation._id,
          participantIdNumber: participant.id_number
        }
      );

      setModalMessage(response.data.message || "Participant removed successfully");
      setShowResultModal(true);
      
      // Refresh reservation data
      setTimeout(() => {
        refreshReservationData();
      }, 1000);
      
    } catch (error) {
      console.error("Error removing participant:", error);
      const errorMessage = error.response?.data?.message || "Failed to remove participant";
      setModalMessage(errorMessage);
      setShowResultModal(true);
    } finally {
      setProcessingParticipantAction("");
      setShowRemoveConfirm(false);
      setParticipantToRemove(null);
    }
  };

  const handleAddParticipant = async () => {
    if (!localReservation || !selectedUser) return;
    
    setProcessingParticipantAction(`add-${selectedUser.id_number}`);
    
    try {
      const response = await axios.post(
        `http://localhost:5000/api/reservations/participants/add`,
        {
          reservationId: localReservation._id,
          participantIdNumber: selectedUser.id_number
        }
      );

      setModalMessage(response.data.message || "Participant added successfully");
      setShowResultModal(true);
      
      // Reset form and refresh data
      setSelectedUser(null);
      setSearchTerm("");
      setShowAddParticipantModal(false);
      
      setTimeout(() => {
        refreshReservationData();
      }, 1000);
      
    } catch (error) {
      console.error("Error adding participant:", error);
      const errorMessage = error.response?.data?.message || "Failed to add participant";
      setModalMessage(errorMessage);
      setShowResultModal(true);
    } finally {
      setProcessingParticipantAction("");
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Debounce search
    if (value.trim().length >= 2) {
      setTimeout(() => {
        fetchAvailableUsers(value);
      }, 300);
    } else {
      setAvailableUsers([]);
    }
  };

  const openRemoveConfirm = (participant) => {
    setParticipantToRemove(participant);
    setShowRemoveConfirm(true);
  };

// Calculate current participant count and maximum allowed
const currentParticipantCount = localReservation?.participants?.length || 0;
const maxParticipants = localReservation?.numUsers || 4;
const canAddMoreParticipants = currentParticipantCount < maxParticipants;

  const handleAction = async (action, data = {}) => {
    if (!localReservation) return;
    
    setProcessingAction(action);
    setModalMessage("");

    try {
      let endpoint = "";
      let method = "post";
      let requestData = {};

      switch (action) {
        case "approve":
          endpoint = `http://localhost:5000/api/reservations/${localReservation._id}/status`;
          method = "patch";
          requestData = { status: "Approved" };
          break;

        case "reject":
          endpoint = `http://localhost:5000/api/reservations/${localReservation._id}/status`;
          method = "patch";
          requestData = { status: "Rejected" };
          break;

        case "start":
          endpoint = `http://localhost:5000/api/reservations/start/${localReservation._id}`;
          method = "post";
          break;

        case "end-early":
          // FIXED: Use the correct endpoint for ending early
          endpoint = `http://localhost:5000/api/reservations/${localReservation._id}/end-early`;
          method = "post"; // Changed from put to post if that's what your backend expects
          break;

        case "cancel":
          endpoint = `http://localhost:5000/api/reservations/${localReservation._id}`;
          method = "delete";
          break;

        case "request-extension":
          endpoint = `http://localhost:5000/api/reservations/${localReservation._id}/request-extension`;
          method = "put";
          requestData = { 
            reason: data.reason || "Need more time"
          };
          break;

        case "approve-extension":
          endpoint = `http://localhost:5000/api/reservations/${localReservation._id}/handle-extension`;
          method = "put";
          requestData = { action: "approve" };
          break;

        case "reject-extension":
          endpoint = `http://localhost:5000/api/reservations/${localReservation._id}/handle-extension`;
          method = "put";
          requestData = { action: "reject" };
          break;

        default:
          throw new Error("Unknown action");
      }

      const response = await axios({
        method,
        url: endpoint,
        data: Object.keys(requestData).length > 0 ? requestData : undefined,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Store conflict info if available
      if (action === "request-extension" && response.data.conflictTime) {
        setConflictInfo({
          time: new Date(response.data.conflictTime),
          hasConflict: true
        });
      }

      setModalMessage(response.data.message || "Action completed successfully.");
      setShowResultModal(true);
      
      // Refresh data after action
      setTimeout(() => {
        refreshReservationData();
      }, 1000);
      
      if (refreshReservations) refreshReservations();
      
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          `Failed to ${action} reservation`;
      setModalMessage(errorMessage);
      setShowResultModal(true);
      
      // If it's a 404, stop auto-refresh and clean up
      if (err.response?.status === 404) {
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
        localStorage.removeItem('selectedReservation');
        setLocalReservation(null);
      }
    } finally {
      setProcessingAction("");
    }
  };

  const handleShowExtendModal = () => {
    setShowExtendModal(true);
  };

  const handleExtendSubmit = async () => {
    await handleAction("request-extension", {
      extensionType: "continuous"
    });
    setShowExtendModal(false);
  };

  const cancelReservation = async () => {
    setCancelling(true);
    await handleAction("cancel");
    setCancelling(false);
    setShowCancelConfirm(false);
  };

  const handleResultModalClose = () => {
    setShowResultModal(false);
    
    // If the reservation was deleted, go back to dashboard
    if (modalMessage.includes("no longer available") || modalMessage.includes("deleted")) {
      localStorage.removeItem('selectedReservation');
      setLocalReservation(null);
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    }
    
    if (refreshReservations) refreshReservations();
    setView("dashboard");
  };

  const formatTimeOnly = (datetime) =>
    new Date(datetime).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  const formatDateOnly = (datetime) =>
    new Date(datetime).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const formatDateTime = (datetime) =>
    new Date(datetime).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

  // Skeleton loader component
  const SkeletonLoader = () => (
    <main className="ml-0 lg:ml-[250px] w-full lg:w-[calc(100%-250px)] flex flex-col min-h-screen bg-gray-50">
      <header className="text-black px-4 lg:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
        <div className="h-8 bg-gray-300 rounded w-48 lg:w-64 animate-pulse"></div>
        <div className="h-6 bg-gray-300 rounded w-24 lg:w-32 animate-pulse"></div>
      </header>
      
      <div className="p-4 lg:p-6 space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100 animate-pulse">
          <div className="h-6 bg-gray-300 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );

  if (loading) {
    return <SkeletonLoader />;
  }

  if (!localReservation) {
    return (
      <div className="ml-0 lg:ml-[250px] p-4 lg:p-8 flex items-center justify-center min-h-[calc(100vh-50px)]">
        <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md text-center">
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-800 mb-2">No reservation selected</h1>
          <p className="text-gray-600 mb-4">Please select a reservation from the list</p>
          <button
            onClick={() => setView("dashboard")}
            className="bg-[#CC0000] text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors cursor-pointer"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const getExtendedEndTime = () => {
    if (!localReservation.extendedEndDatetime) return null;
    return new Date(localReservation.extendedEndDatetime);
  };

  const extendedEndTime = getExtendedEndTime();
  const originalEndTime = new Date(localReservation.endDatetime);
  const currentEndTime = extendedEndTime || originalEndTime;

  const statusColorClass = {
    Pending: "bg-yellow-100 text-yellow-800 border border-yellow-200",
    Approved: "bg-green-100 text-green-800 border border-green-200",
    Rejected: "bg-red-100 text-red-800 border border-red-200",
    Cancelled: "bg-gray-100 text-gray-600 border border-gray-200",
    Expired: "bg-gray-200 text-gray-500 border border-gray-300",
    Ongoing: "bg-blue-100 text-blue-800 border border-blue-200",
    Completed: "bg-purple-100 text-purple-800 border border-purple-200",
  }[localReservation.status] || "bg-gray-100 text-gray-600 border border-gray-200";

  const canRequestExtension = localReservation.status === "Ongoing" && 
                             !localReservation.extensionRequested && 
                             isMainReserver;

  const hasPendingExtension = localReservation.extensionRequested && 
                             localReservation.extensionStatus === "Pending";

  const hasRejectedExtension = localReservation.extensionRequested && 
                              localReservation.extensionStatus === "Rejected";

  return (
    <main className="ml-0 lg:ml-[250px] w-full lg:w-[calc(100%-250px)] flex flex-col min-h-screen bg-gray-50">
      <header className="text-black px-4 lg:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
        <h1 className="text-lg md:text-xl lg:text-2xl font-bold tracking-wide">Reservation Details</h1>
        <button 
          onClick={() => setView("dashboard")}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Back to Dashboard</span>
        </button>
      </header>

      <div className="p-4 lg:p-6 space-y-6">
        {/* Reservation Information Card */}
        <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Reservation Information</h2>
          
          {/* Extension Status Banner */}
          {hasPendingExtension && (
            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-yellow-800 font-medium">Extension Request Pending Approval</span>
              </div>
            </div>
          )}

          {localReservation.extensionStatus === "Approved" && (
            <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-800 font-medium">Extension Approved</span>
              </div>
            </div>
          )}

          {hasRejectedExtension && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-800 font-medium">Extension Request Declined</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
            {/* Date - Separate from Time */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Date
              </p>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="font-medium text-gray-800 text-sm lg:text-base">{formatDateOnly(localReservation.datetime)}</p>
              </div>
            </div>

            {/* Original Time - Separate from Date */}
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Original Time
              </p>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="font-medium text-gray-800 text-sm lg:text-base">
                  {formatTimeOnly(localReservation.datetime)} - {formatTimeOnly(localReservation.endDatetime)}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Room
              </p>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="font-medium text-gray-800 text-sm lg:text-base">{localReservation.roomName}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Location
              </p>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="font-medium text-gray-800 text-sm lg:text-base">{localReservation.location}</p>
              </div>
            </div>
            
            <div className="md:col-span-2 lg:col-span-1 space-y-1">
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Purpose
              </p>
              <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="font-medium text-gray-800 text-sm lg:text-base">{localReservation.purpose}</p>
              </div>
            </div>
            
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Status
              </p>
              <div className={`p-3 w-full text-center rounded-lg font-semibold text-sm lg:text-base ${statusColorClass}`}>
                {localReservation.status}
              </div>
            </div>
          </div>

          {/* Current Schedule */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Current Schedule
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-gray-600">Start Time:</p>
                <p className="font-medium text-gray-800 text-sm lg:text-base">{formatTimeOnly(localReservation.datetime)}</p>
              </div>
              <div className={`p-3 rounded-lg border ${extendedEndTime ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                <p className="text-sm text-gray-600">Current End Time:</p>
                <p className={`font-medium text-sm lg:text-base ${extendedEndTime ? 'text-green-600' : 'text-gray-800'}`}>
                  {formatTimeOnly(currentEndTime)}
                  {extendedEndTime && <span className="text-xs ml-2 text-green-600">(Extended)</span>}
                </p>
              </div>
            </div>
          </div>

          {/* Conflict Information */}
          {conflictInfo && conflictInfo.hasConflict && (
            <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-sm text-orange-700 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <strong>Note:</strong> Extension can only be granted until {formatTimeOnly(conflictInfo.time)} due to a conflicting reservation.
              </p>
            </div>
          )}
        </div>

        {/* Room/Floor Image - Dynamically show based on reservation */}
        {roomImage && (
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">
              {roomImage.category === "Floor" ? "Floor Location" : "Room Location"}
            </h2>
            <div className="flex flex-col justify-center items-center">
              <img
                src={roomImage.url}
                alt={roomImage.name}
                className="rounded-lg shadow-md w-full max-w-2xl border border-gray-200"
              />
              <p className="font-semibold text-base lg:text-lg mt-4 bg-gray-100 px-4 py-2 rounded-lg border border-gray-200">
                {localReservation.roomName} - {localReservation.location}
              </p>
            </div>
          </div>
        )}

        {/* Participants Table */}
        {localReservation.participants && localReservation.participants.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-4 lg:p-6 border border-gray-100">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Participants</h2>
              {isMainReserver && ["Pending", "Approved"].includes(localReservation.status) && (
                <button
                  onClick={() => setShowManageParticipants(true)}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center cursor-pointer text-sm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                  </svg>
                  Manage Participants
                </button>
              )}
            </div>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#FFCC00]">
                  <tr>
                    <th className="px-3 py-2 lg:px-4 lg:py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ID Number</th>
                    <th className="px-3 py-2 lg:px-4 lg:py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 lg:px-4 lg:py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Course</th>
                    <th className="px-3 py-2 lg:px-4 lg:py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Year Level</th>
                    <th className="px-3 py-2 lg:px-4 lg:py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Department</th>
                    {isMainReserver && ["Pending", "Approved"].includes(localReservation.status) && (
                      <th className="px-3 py-2 lg:px-4 lg:py-3 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {localReservation.participants.map((p, i) => (
                    <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 whitespace-nowrap text-xs lg:text-sm font-medium text-gray-900">
                        {p.id_number || p.idNumber || "N/A"}
                      </td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                        {p.name || "N/A"}
                      </td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-gray-500">
                        {p.course || "N/A"}
                      </td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-gray-500">
                        {p.year_level || p.yearLevel || "N/A"}
                      </td>
                      <td className="px-3 py-2 lg:px-4 lg:py-3 whitespace-nowrap text-xs lg:text-sm text-gray-500">
                        {p.department || "N/A"}
                      </td>
                      {isMainReserver && ["Pending", "Approved"].includes(localReservation.status) && (
                        <td className="px-3 py-2 lg:px-4 lg:py-3 whitespace-nowrap text-xs lg:text-sm">
                          <button
                            onClick={() => openRemoveConfirm(p)}
                            disabled={processingParticipantAction === `remove-${p.id_number}`}
                            className="text-red-600 hover:text-red-800 disabled:opacity-50 transition-colors cursor-pointer flex items-center"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            {processingParticipantAction === `remove-${p.id_number}` ? "Removing..." : "Remove"}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          <div className="mt-3 text-sm text-gray-500">
  <p>Total Participants: {currentParticipantCount} / {maxParticipants}</p>
  {!canAddMoreParticipants && (
    <p className="text-orange-600 font-medium">Maximum participants reached ({maxParticipants} participants maximum)</p>
  )}
</div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-3 lg:gap-4 pt-4">
          {/* Staff/Admin Actions */}
          {isStaffOrAdmin && (
            <>
              {localReservation.status === "Pending" && (
                <>
                  <button
                    onClick={() => setShowApproveConfirm(true)}
                    disabled={processingAction === "approve"}
                    className="px-4 lg:px-5 py-2 lg:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer text-sm lg:text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {processingAction === "approve" ? "Approving..." : "Approve"}
                  </button>
                  <button
                    onClick={() => setShowRejectConfirm(true)}
                    disabled={processingAction === "reject"}
                    className="px-4 lg:px-5 py-2 lg:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer text-sm lg:text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    {processingAction === "reject" ? "Rejecting..." : "Reject"}
                  </button>
                </>
              )}

              {localReservation.status === "Approved" && (
                <button
                  onClick={() => setShowStartConfirm(true)}
                  disabled={processingAction === "start"}
                  className="px-4 lg:px-5 py-2 lg:py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer text-sm lg:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  {processingAction === "start" ? "Starting..." : "Start Reservation"}
                </button>
              )}

              {localReservation.status === "Ongoing" && (
                <>
                  <button
                    onClick={() => setShowEndEarlyConfirm(true)}
                    disabled={processingAction === "end-early"}
                    className="px-4 lg:px-5 py-2 lg:py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer text-sm lg:text-base"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                    {processingAction === "end-early" ? "Ending..." : "End Early"}
                  </button>

                  {/* Extension Request Handling */}
                  {hasPendingExtension && (
                    <>
                      <button
                        onClick={() => setShowApproveExtensionConfirm(true)}
                        disabled={processingAction === "approve-extension"}
                        className="px-4 lg:px-5 py-2 lg:py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer text-sm lg:text-base"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        {processingAction === "approve-extension" ? "Approving..." : "Approve Extension"}
                      </button>
                      <button
                        onClick={() => setShowRejectExtensionConfirm(true)}
                        disabled={processingAction === "reject-extension"}
                        className="px-4 lg:px-5 py-2 lg:py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer text-sm lg:text-base"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        {processingAction === "reject-extension" ? "Rejecting..." : "Reject Extension"}
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* User Actions */}
          {isMainReserver && (
            <>
              {["Pending", "Approved"].includes(localReservation.status) && (
                <button
                  onClick={() => setShowCancelConfirm(true)}
                  disabled={cancelling || processingAction}
                  className={`px-4 lg:px-5 py-2 lg:py-2.5 rounded-lg transition-colors flex items-center cursor-pointer text-sm lg:text-base ${
                    cancelling || processingAction
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-gray-600 text-white hover:bg-gray-800"
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {cancelling ? "Cancelling..." : "Cancel Reservation"}
                </button>
              )}

              {localReservation.status === "Ongoing" && (
                <button
                  onClick={() => setShowEndEarlyConfirm(true)}
                  disabled={processingAction === "end-early"}
                  className="px-4 lg:px-5 py-2 lg:py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer text-sm lg:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                  </svg>
                  {processingAction === "end-early" ? "Ending..." : "End Early"}
                </button>
              )}

              {canRequestExtension && (
                <button
                  onClick={handleShowExtendModal}
                  disabled={processingAction}
                  className="px-4 lg:px-5 py-2 lg:py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer text-sm lg:text-base"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 lg:h-5 lg:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                  Request Extension
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* All existing modals remain exactly the same */}
      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className=" inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4 fixed">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Cancel Reservation</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to cancel this reservation? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCancelConfirm(false)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                No, Keep It
              </button>
              <button
                onClick={cancelReservation}
                disabled={cancelling}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {cancelling ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Early Confirmation Modal */}
      {showEndEarlyConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-orange-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">End Reservation Early</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to end this reservation early? This will mark the reservation as completed.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowEndEarlyConfirm(false)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAction("end-early");
                  setShowEndEarlyConfirm(false);
                }}
                disabled={processingAction === "end-early"}
                className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingAction === "end-early" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Ending...
                  </>
                ) : (
                  "Yes, End Early"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Start Reservation Confirmation Modal */}
      {showStartConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Start Reservation</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to start this reservation? This will change the status to Ongoing.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowStartConfirm(false)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAction("start");
                  setShowStartConfirm(false);
                }}
                disabled={processingAction === "start"}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingAction === "start" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Starting...
                  </>
                ) : (
                  "Yes, Start"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Approve Reservation</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to approve this reservation? The user will be notified.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveConfirm(false)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAction("approve");
                  setShowApproveConfirm(false);
                }}
                disabled={processingAction === "approve"}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingAction === "approve" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Approving...
                  </>
                ) : (
                  "Yes, Approve"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Reject Reservation</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to reject this reservation? The user will be notified.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectConfirm(false)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAction("reject");
                  setShowRejectConfirm(false);
                }}
                disabled={processingAction === "reject"}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingAction === "reject" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rejecting...
                  </>
                ) : (
                  "Yes, Reject"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Extension Confirmation Modal */}
      {showApproveExtensionConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Approve Extension</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to approve this extension request? The reservation end time will be extended.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowApproveExtensionConfirm(false)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAction("approve-extension");
                  setShowApproveExtensionConfirm(false);
                }}
                disabled={processingAction === "approve-extension"}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingAction === "approve-extension" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Approving...
                  </>
                ) : (
                  "Yes, Approve"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Extension Confirmation Modal */}
      {showRejectExtensionConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Reject Extension</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to reject this extension request? The user will be notified.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRejectExtensionConfirm(false)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleAction("reject-extension");
                  setShowRejectExtensionConfirm(false);
                }}
                disabled={processingAction === "reject-extension"}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingAction === "reject-extension" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Rejecting...
                  </>
                ) : (
                  "Yes, Reject"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result Modal */}
      {showResultModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[95] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Action Result</h3>
            </div>
            <p className="text-gray-600 mb-6">{modalMessage}</p>
            <div className="flex justify-end">
              <button
                onClick={handleResultModalClose}
                className="px-6 py-2.5 bg-[#CC0000] text-white rounded-lg hover:bg-red-700 transition-colors cursor-pointer font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Request Time Extension</h3>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 font-medium mb-2">
                  Continuous Extension System
                </p>
                <p className="text-sm text-blue-700">
                  Your reservation will continue automatically until you end it, staff ends it, or until the next reservation starts.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Schedule
                </label>
                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Start:</span>
                    <span className="text-sm font-medium text-gray-800">{formatTimeOnly(localReservation.datetime)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-600">Current End:</span>
                    <span className={`text-sm font-medium ${extendedEndTime ? 'text-green-600' : 'text-gray-800'}`}>
                      {formatTimeOnly(currentEndTime)}
                      {extendedEndTime && <span className="text-xs ml-1">(Extended)</span>}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How it works:
                </label>
                <ul className="text-sm text-gray-600 space-y-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Reservation continues automatically
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Stops at next reservation (if any)
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    You can end anytime with "End Early"
                  </li>
                  <li className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Staff can also end the reservation
                  </li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Extension (Optional)
                </label>
                <textarea
                  placeholder="Why do you need continuous extension?"
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExtendModal(false)}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendSubmit}
                disabled={processingAction === "request-extension"}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingAction === "request-extension" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Requesting...
                  </>
                ) : (
                  "Start Continuous Extension"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Participant Confirmation Modal */}
      {showRemoveConfirm && participantToRemove && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-red-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Remove Participant</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to remove <strong>{participantToRemove.name}</strong> (ID: {participantToRemove.id_number}) from this reservation? 
              They will be notified about this change.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRemoveConfirm(false);
                  setParticipantToRemove(null);
                }}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRemoveParticipant(participantToRemove)}
                disabled={processingParticipantAction === `remove-${participantToRemove.id_number}`}
                className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingParticipantAction === `remove-${participantToRemove.id_number}` ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Removing...
                  </>
                ) : (
                  "Yes, Remove"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {showAddParticipantModal && (
        <div className="fixed inset-0 bg-black/0 backdrop-blur-sm flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 p-2 rounded-full mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800">Add Participant</h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search by Name or ID Number
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Enter name or ID number..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {availableUsers.length > 0 && (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                  {availableUsers.map((user) => (
                    <div
                      key={user.id_number}
                      className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedUser?.id_number === user.id_number ? 'bg-indigo-50 border-indigo-200' : ''
                      }`}
                      onClick={() => setSelectedUser(user)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-800">{user.name}</p>
                          <p className="text-sm text-gray-600">ID: {user.id_number}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{user.course}</p>
                          <p className="text-xs text-gray-500">{user.department}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {searchTerm.length >= 2 && availableUsers.length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  No users found matching your search.
                </div>
              )}

              {selectedUser && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800 font-medium">Selected Participant:</p>
                  <p className="font-medium">{selectedUser.name} (ID: {selectedUser.id_number})</p>
                  <p className="text-sm text-green-700">{selectedUser.course} - {selectedUser.department}</p>
                </div>
              )}

             {!canAddMoreParticipants && (
  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
    <p className="text-sm font-medium text-orange-800">
      Maximum participants reached ({maxParticipants} participants maximum)
    </p>
    <p className="text-sm text-orange-700 mt-1">
      Remove a participant first to add a new one. Maximum of {maxParticipants} participants allowed per reservation.
    </p>
  </div>
)}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddParticipantModal(false);
                  setSelectedUser(null);
                  
                  setSearchTerm("");
                  setAvailableUsers([]);
                }}
                className="px-6 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddParticipant}
                disabled={!selectedUser || !canAddMoreParticipants || processingParticipantAction}
                className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center cursor-pointer font-medium"
              >
                {processingParticipantAction ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Adding...
                  </>
                ) : (
                  "Add Participant"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Participants Modal */}
{showManageParticipants && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
    <div className="bg-white rounded-2xl p-6 w-full max-w-4xl shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 p-3 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-800">Manage Participants</h3>
            <p className="text-sm text-gray-600 mt-1">Add or remove participants from this reservation</p>
          </div>
        </div>
        <button
          onClick={() => setShowManageParticipants(false)}
          className="text-gray-400 hover:text-gray-600 cursor-pointer p-1 hover:bg-gray-100 rounded-full transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-blue-800">
  Current Participants: {currentParticipantCount} / {maxParticipants}
</p>
            <p className="text-sm text-blue-700 mt-1">
              You can remove existing participants and add new ones. Maximum of 4 participants allowed.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Current Participants Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800 text-lg">Current Participants</h4>
       <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-sm font-medium">
  {localReservation.participants.length} of {maxParticipants}
</span>
          </div>
          
          <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
            {localReservation.participants.length > 0 ? (
              localReservation.participants.map((participant, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors shadow-sm">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-100 p-2 rounded-full">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{participant.name}</p>
                      <p className="text-sm text-gray-600">ID: {participant.id_number}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => openRemoveConfirm(participant)}
                    disabled={processingParticipantAction === `remove-${participant.id_number}`}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    title="Remove participant"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-gray-500 font-medium">No participants added yet</p>
                <p className="text-sm text-gray-400 mt-1">Add participants using the form on the right</p>
              </div>
            )}
          </div>
        </div>

        {/* Add Participants Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-800 text-lg">Add New Participant</h4>
            <button
              onClick={() => setShowAddParticipantModal(true)}
              disabled={!canAddMoreParticipants}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all ${
                canAddMoreParticipants
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow cursor-pointer'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Add New</span>
            </button>
          </div>

          {!canAddMoreParticipants ? (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-orange-800">Maximum participants reached</p>
<p className="text-sm text-orange-700 mt-1">
  Remove a participant first to add a new one. Maximum of {maxParticipants} participants allowed per reservation.
</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <p className="text-gray-600 font-medium mb-1">Add participants to this reservation</p>
              <p className="text-sm text-gray-500">Click "Add New" to search for and add participants</p>
              <p className="text-xs text-gray-400 mt-2">{maxParticipants - currentParticipantCount} spots available</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button
          onClick={() => setShowManageParticipants(false)}
          className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors cursor-pointer font-medium shadow-sm"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  );
}

export default ReservationDetails;