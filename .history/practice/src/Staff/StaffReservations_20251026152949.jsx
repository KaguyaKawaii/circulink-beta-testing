import React, { useState, useEffect } from "react";
import axios from "axios";
import { Eye, RefreshCw, Search, ChevronDown, X, Play } from "lucide-react";
import ReservationModal from "./Modals/ReservationModal";

function StaffReservations({ staff }) {
  const [reservations, setReservations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

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

  const handleStart = async (reservation) => {
    try {
      setIsProcessing(true);
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations/start/${reservation._id}`);
      
      if (response.data) {
        await fetchReservations(); // Refresh the list
        alert("Reservation started successfully!");
      }
    } catch (err) {
      console.error("Error starting reservation:", err);
      alert(err.response?.data?.message || "Failed to start reservation");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPHDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-PH", {
          timeZone: "Asia/Manila",
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-yellow-100 text-yellow-800";
      case "Approved": return "bg-green-100 text-green-800";
      case "Ongoing": return "bg-blue-100 text-blue-800";
      case "Rejected": return "bg-red-100 text-red-800";
      case "Cancelled": return "bg-gray-100 text-gray-800";
      case "Expired": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const normalizeFloorName = (floorName) => {
    if (!floorName) return "";
    const normalized = floorName.toLowerCase().trim();
    
    if (normalized.includes("2nd") || normalized.includes("second")) return "2nd Floor";
    if (normalized.includes("3rd") || normalized.includes("third")) return "3rd Floor";
    if (normalized.includes("4th") || normalized.includes("fourth")) return "4th Floor";
    if (normalized.includes("5th") || normalized.includes("fifth")) return "5th Floor";
    
    return floorName;
  };

  const fetchReservations = async () => {
    if (!staff?._id) {
      setReservations([]);
      return;
    }

    try {
      setIsLoading(true);
      const url = `${import.meta.env.VITE_API_URL}/api/reservations`;
      const response = await axios.get(url);

      if (staff?.floor && staff.floor !== "N/A") {
        const normalizedStaffFloor = normalizeFloorName(staff.floor);
        const filteredReservations = response.data.filter(reservation => {
          const normalizedReservationFloor = normalizeFloorName(reservation.location);
          return normalizedReservationFloor === normalizedStaffFloor;
        });
        
        const sorted = filteredReservations.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt) : 0;
          const bTime = b.createdAt ? new Date(b.createdAt) : 0;
          return bTime - aTime;
        });
        
        setReservations(sorted);
      } else {
        const sorted = response.data.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt) : 0;
          const bTime = b.createdAt ? new Date(b.createdAt) : 0;
          return bTime - aTime;
        });
        setReservations(sorted);
      }
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setReservations([]);
    } finally {
      setIsLoading(false);
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

  const handleActionSuccess = () => {
    fetchReservations(); // Refresh the list after successful action
  };

  const filteredReservations = reservations.filter((res) => {
    const reserver = res.userId?.name || "";
    const matchesStatus = filter === "All" || res.status === filter;
    const matchesSearch =
      reserver.toLowerCase().includes(search.toLowerCase()) ||
      (res.roomName || "").toLowerCase().includes(search.toLowerCase()) ||
      (res.location || "").toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  useEffect(() => {
    if (staff?._id) {
      fetchReservations();
      const interval = setInterval(fetchReservations, 15000);
      return () => clearInterval(interval);
    }
  }, [staff?._id, staff?.floor]);

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
                : "No floor assigned"
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

        {/* Reservations Table - Updated to match Admin design */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">#</th>
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3 text-left font-medium">Time</th>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">
                    Reserved By
                  </th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">
                    Created At
                  </th>
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
                      Loading reservations...
                    </td>
                  </tr>
                ) : filteredReservations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      {reservations.length === 0 
                        ? "No reservations found for your assigned floor."
                        : "No reservations match your search criteria."
                      }
                    </td>
                  </tr>
                ) : (
                  filteredReservations.map((r, i) => {
                    const createdAt = r.createdAt
                      ? new Date(r.createdAt)
                      : null;
                    const startDate = new Date(r.datetime);
                    const endDate = new Date(r.endDatetime);

                    const dateOnly = startDate.toLocaleDateString("en-PH", {
                      timeZone: "Asia/Manila",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });

                    const startTime = startDate.toLocaleTimeString("en-PH", {
                      timeZone: "Asia/Manila",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });

                    const endTime = endDate.toLocaleTimeString("en-PH", {
                      timeZone: "Asia/Manila",
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    });

                    return (
                      <tr key={r._id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">{i + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{dateOnly}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {startTime} — {endTime}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{r.roomName}</div>
                          <div className="text-gray-500 text-xs">{r.location}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="font-medium text-gray-900">
                              {r.userId?.name || "N/A"}
                            </div>
                            <div className="text-xs text-gray-500">
                              {r.userId?.id_number || "N/A"}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              r.status === "Approved"
                                ? "bg-green-100 text-green-800"
                                : r.status === "Pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : r.status === "Ongoing"
                                ? "bg-blue-100 text-blue-800"
                                : r.status === "Rejected"
                                ? "bg-red-100 text-red-800"
                                : r.status === "Cancelled"
                                ? "bg-gray-100 text-gray-800"
                                : r.status === "Expired"
                                ? "bg-orange-100 text-orange-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {r.status}
                            {r.extensionRequested && (
                              <span className="ml-1 text-xs">
                                (Ext)
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {createdAt ? formatPHDateTime(createdAt) : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex justify-end space-x-2">
                            {/* View */}
                            <button
                              onClick={() => handleView(r)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="View Details"
                            >
                              <Eye size={18} />
                            </button>
                            
                            {/* Start button for Approved reservations */}
                            {r.status === "Approved" && (
                              <button
                                onClick={() => handleStart(r)}
                                disabled={isProcessing}
                                className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                                title="Start Reservation"
                              >
                                <Play size={18} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
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
    </main>
  );
}

export default StaffReservations;