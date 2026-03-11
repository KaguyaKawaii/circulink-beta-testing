import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import { Eye, RefreshCw, Search, ChevronDown, X, Play } from "lucide-react";
import ReservationModal from "./Modals/ReservationModal";
import ConfirmationModal from "./Modals/ConfirmationModal";

// Utility functions
const formatPHDateTime = (date) =>
  date
    ? new Date(date).toLocaleString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : "—";

const formatPHDate = (date) =>
  date
    ? new Date(date).toLocaleDateString("en-PH", {
        timeZone: "Asia/Manila",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

const formatTimeRange = (start, end) => {
  const startTime = new Date(start).toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  const endTime = new Date(end).toLocaleTimeString("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${startTime} — ${endTime}`;
};

const normalizeFloorName = (floorName) => {
  if (!floorName) return "";
  const normalized = floorName.toLowerCase().trim();
  
  if (normalized.includes("ground")) return "Ground Floor";
  if (normalized.includes("2nd") || normalized.includes("second")) return "2nd Floor";
  if (normalized.includes("3rd") || normalized.includes("third")) return "3rd Floor";
  if (normalized.includes("4th") || normalized.includes("fourth")) return "4th Floor";
  if (normalized.includes("5th") || normalized.includes("fifth")) return "5th Floor";
  
  return floorName;
};

const STATUS_COLORS = {
  Pending: "bg-yellow-100 text-yellow-800",
  Approved: "bg-green-100 text-green-800",
  Ongoing: "bg-blue-100 text-blue-800",
  Rejected: "bg-red-100 text-red-800",
  Cancelled: "bg-gray-100 text-gray-800",
  Expired: "bg-orange-100 text-orange-800",
  Completed: "bg-purple-100 text-purple-800",
};

const getStatusColor = (status) => {
  return STATUS_COLORS[status] || "bg-gray-100 text-gray-800";
};

// Reservation Row Component
const ReservationRow = ({ 
  reservation, 
  index, 
  onView, 
  onStart, 
  isProcessing 
}) => {
  const startDate = new Date(reservation.datetime);
  const endDate = new Date(reservation.endDatetime);
  const createdAt = reservation.createdAt ? new Date(reservation.createdAt) : null;

  const dateOnly = formatPHDate(reservation.datetime);
  const timeRange = formatTimeRange(reservation.datetime, reservation.endDatetime);

  return (
    <tr key={reservation._id} className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap">{index + 1}</td>
      <td className="px-6 py-4 whitespace-nowrap">{dateOnly}</td>
      <td className="px-6 py-4 whitespace-nowrap">{timeRange}</td>
      <td className="px-6 py-4">
        <div className="font-medium">{reservation.roomName}</div>
        <div className="text-gray-500 text-xs">{reservation.location}</div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div>
          <div className="font-medium text-gray-900">
            {reservation.userId?.name || "N/A"}
          </div>
          <div className="text-xs text-gray-500">
            {reservation.userId?.id_number || "N/A"}
          </div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}
        >
          {reservation.status}
          {reservation.extensionRequested && (
            <span className="ml-1 text-xs">(Ext)</span>
          )}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        {createdAt ? formatPHDateTime(createdAt) : "—"}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => onView(reservation)}
            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
            aria-label={`View details for reservation by ${reservation.userId?.name}`}
            title="View Details"
          >
            <Eye size={18} />
          </button>
          
          {reservation.status === "Approved" && (
            <button
              onClick={() => onStart(reservation)}
              disabled={isProcessing}
              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
              aria-label={`Start reservation for ${reservation.userId?.name}`}
              title="Start Reservation"
            >
              <Play size={18} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

function StaffReservations({ staff }) {
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingReservations, setProcessingReservations] = useState(new Set());
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [confirmationData, setConfirmationData] = useState(null);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [apiError, setApiError] = useState(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReservations = useCallback(async () => {
    if (!staff?._id) {
      setReservations([]);
      return;
    }

    try {
      setIsLoading(true);
      setApiError(null);
      
      // Try the staff-specific endpoint first
      const staffUrl = `${import.meta.env.VITE_API_URL}/api/reservations/staff/${staff._id}`;
      console.log("Fetching from staff endpoint:", staffUrl);
      
      let response;
      try {
        response = await axios.get(staffUrl);
        console.log("Staff endpoint response:", response.data);
        
        if (response.data.success) {
          setReservations(response.data.reservations || []);
          console.log(`Loaded ${response.data.reservations.length} reservations for ${response.data.staff.name}`);
          return;
        }
      } catch (staffErr) {
        console.log("Staff endpoint failed, falling back to regular endpoint");
      }
      
      // Fallback to regular endpoint with userId parameter
      const url = `${import.meta.env.VITE_API_URL}/api/reservations?userId=${staff._id}`;
      console.log("Fetching from fallback URL:", url);
      
      response = await axios.get(url);
      console.log("All reservations fetched:", response.data.length);
      
      // Filter reservations based on staff's assigned floor
      if (staff?.floor && staff.floor !== "N/A") {
        const normalizedStaffFloor = normalizeFloorName(staff.floor);
        console.log("Staff floor (normalized):", normalizedStaffFloor);
        
        const filteredReservations = response.data.filter(reservation => {
          const normalizedReservationFloor = normalizeFloorName(reservation.location);
          const matchesFloor = normalizedReservationFloor === normalizedStaffFloor;
          
          // Log for debugging
          if (reservation.status === "Approved") {
            console.log(`Approved reservation for ${reservation.roomName} at ${reservation.location} (normalized: ${normalizedReservationFloor}) - matches: ${matchesFloor}`);
          }
          
          return matchesFloor;
        });
        
        console.log(`Filtered to ${filteredReservations.length} reservations for floor ${normalizedStaffFloor}`);
        
        const sorted = filteredReservations.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt) : 0;
          const bTime = b.createdAt ? new Date(b.createdAt) : 0;
          return bTime - aTime;
        });
        
        setReservations(sorted);
      } else {
        // If staff has no floor assigned, show all reservations
        console.log("No floor assigned, showing all reservations");
        const sorted = response.data.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt) : 0;
          const bTime = b.createdAt ? new Date(b.createdAt) : 0;
          return bTime - aTime;
        });
        setReservations(sorted);
      }
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setApiError(err.response?.data?.message || err.message);
      setReservations([]);
    } finally {
      setIsLoading(false);
    }
  }, [staff?._id, staff?.floor]);

  const handleStart = async (reservation) => {
    try {
      setProcessingReservations(prev => new Set(prev).add(reservation._id));
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/start/${reservation._id}`
      );
      
      if (response.data) {
        await fetchReservations();
        setConfirmationData({
          type: "success",
          title: "Reservation Started",
          message: "Reservation has been started successfully!",
        });
        setShowConfirmationModal(true);
      }
    } catch (err) {
      console.error("Error starting reservation:", err);
      const errorMessage = err.response?.data?.message || "Failed to start reservation";
      setConfirmationData({
        type: "error",
        title: "Error",
        message: errorMessage,
      });
      setShowConfirmationModal(true);
    } finally {
      setProcessingReservations(prev => {
        const newSet = new Set(prev);
        newSet.delete(reservation._id);
        return newSet;
      });
    }
  };

  const handleView = (reservation) => {
    setSelectedReservation(reservation);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setSelectedReservation(null);
    setShowModal(false);
  };

  const handleCloseConfirmationModal = () => {
    setShowConfirmationModal(false);
    setConfirmationData(null);
  };

  const handleActionSuccess = () => {
    fetchReservations();
  };

  // Memoized filtered reservations (for status and search)
  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      const reserver = res.userId?.name || "";
      const matchesStatus = filter === "All" || res.status === filter;
      const matchesSearch =
        reserver.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (res.roomName || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (res.location || "").toLowerCase().includes(debouncedSearch.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [reservations, filter, debouncedSearch]);

  // Fetch reservations on component mount and when staff changes
  useEffect(() => {
    if (staff?._id) {
      fetchReservations();
    }
  }, [staff?._id, staff?.floor, fetchReservations]);

  // Count reservations by status
  const pendingCount = reservations.filter(r => r.status === "Pending").length;
  const approvedCount = reservations.filter(r => r.status === "Approved").length;
  const ongoingCount = reservations.filter(r => r.status === "Ongoing").length;
  const completedCount = reservations.filter(r => r.status === "Completed").length;

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#CC0000]">
              Reservation Management
            </h1>
            <p className="text-gray-600">
              {staff?.floor && staff.floor !== "N/A" 
                ? `Managing reservations for ${staff.floor}`
                : "No floor assigned - showing all reservations"
              }
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, room, location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

            {/* Status filter */}
            <div className="relative">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Cancelled">Cancelled</option>
                <option value="Expired">Expired</option>
                <option value="Completed">Completed</option>
              </select>
              <ChevronDown
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
            </div>

            {/* Refresh */}
            <button
              onClick={fetchReservations}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Total Reservations</p>
            <p className="text-2xl font-bold text-gray-900">{reservations.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
            {pendingCount > 0 && (
              <p className="text-xs text-yellow-600 mt-1">Waiting for approval</p>
            )}
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Approved</p>
            <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
            {approvedCount > 0 && (
              <p className="text-xs text-green-600 mt-1">Ready to start</p>
            )}
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <p className="text-sm text-gray-600 mb-1">Ongoing</p>
            <p className="text-2xl font-bold text-blue-600">{ongoingCount}</p>
          </div>
        </div>

        {/* API Error Message */}
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-700 text-sm">Error loading reservations: {apiError}</p>
          </div>
        )}

        {/* Reservations Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">#</th>
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3 text-left font-medium">Time</th>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">Reserved By</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Created At</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw size={24} className="animate-spin text-blue-600 mr-3" />
                        <span>Loading reservations...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      <div className="text-center py-12">
                        <Search className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                          {reservations.length === 0 ? "No reservations found" : "No matching reservations"}
                        </h3>
                        <p className="text-gray-500 max-w-md mx-auto">
                          {reservations.length === 0 
                            ? staff?.floor && staff.floor !== "N/A"
                              ? `No reservations have been made for ${staff.floor} yet.`
                              : "No reservations have been made yet."
                            : "Try adjusting your search or filter criteria."
                          }
                        </p>
                        {reservations.length === 0 && staff?.floor && staff.floor !== "N/A" && (
                          <p className="text-sm text-gray-400 mt-4">
                            Note: Reservations must be approved by admin before appearing here.
                          </p>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((reservation, index) => (
                    <ReservationRow
                      key={reservation._id}
                      reservation={reservation}
                      index={index}
                      onView={handleView}
                      onStart={handleStart}
                      isProcessing={processingReservations.has(reservation._id)}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination info */}
          {filteredReservations.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Showing {filteredReservations.length} of {reservations.length} total reservations
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reservation Modal */}
      {showModal && selectedReservation && (
        <ReservationModal
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onActionSuccess={handleActionSuccess}
          currentUser={staff}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmationModal && confirmationData && (
        <ConfirmationModal
          type={confirmationData.type}
          title={confirmationData.title}
          message={confirmationData.message}
          onClose={handleCloseConfirmationModal}
        />
      )}
    </main>
  );
}

export default StaffReservations;