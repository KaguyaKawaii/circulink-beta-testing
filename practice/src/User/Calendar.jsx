import React, { useEffect, useState } from "react";
import moment from "moment-timezone";
import CalendarModal from "./Modals/CalendarModal";

// ✅ Update this to match your backend URL
const API_BASE_URL = "https://circulink-beta-testing.onrender.com";

function Calendar() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [roomStatuses, setRoomStatuses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const formatTime = (iso) => {
    return moment(iso).tz("Asia/Manila").format("hh:mm A");
  };

  // Get current user ID from localStorage or context
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        const user = JSON.parse(userData);
        setCurrentUserId(user.id);
      } catch (e) {
        console.error("Error parsing user data:", e);
      }
    }
  }, []);

  const fetchAvailability = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateStr = selectedDate.toISOString().split("T")[0];
      const url = `${API_BASE_URL}/reservations/availability?date=${dateStr}`;
      console.log("Fetching availability from:", url);
      
      const res = await fetch(url);

      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      if (!Array.isArray(data)) throw new Error("Invalid availability format");

      setRoomStatuses(data);
    } catch (err) {
      console.error("Error fetching availability:", err);
      setError(`Failed to load room availability: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability();
  }, [selectedDate]);

  // Filter room statuses based on user permissions (same logic as RoomAvailabilityModal)
  const getFilteredRoomStatus = (room) => {
    const isRoomActive = room.isActive !== false;
    const approvedOccupied = Array.isArray(room.occupied) ? room.occupied : [];
    const pendingReservations = Array.isArray(room.pending) ? room.pending : [];
    
    // For all users, show approved/ongoing reservations
    // For pending reservations, only show if they belong to the current user
    const visiblePending = currentUserId 
      ? pendingReservations.filter(p => p.mine === true)
      : [];

    return {
      ...room,
      occupied: approvedOccupied, // Always show approved/ongoing
      pending: visiblePending, // Only show user's own pending reservations
    };
  };

  const filteredRoomStatuses = roomStatuses.map(getFilteredRoomStatus);

  const groupedByFloor = filteredRoomStatuses.reduce((acc, room) => {
    const floor = room.floor || "Unknown Floor";
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  // Helper function to determine room status
  const getRoomStatus = (room) => {
    const isRoomActive = room.isActive !== false;
    const hasOccupied = Array.isArray(room.occupied) && room.occupied.length > 0;
    const hasPending = Array.isArray(room.pending) && room.pending.length > 0;

    if (!isRoomActive) {
      return { status: 'inactive', color: 'gray' };
    } else if (hasOccupied) {
      return { status: 'occupied', color: 'red' };
    } else if (hasPending) {
      return { status: 'pending', color: 'yellow' };
    } else {
      return { status: 'available', color: 'green' };
    }
  };

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] h-screen flex flex-col bg-gray-50 text-gray-800">
      <header className="text-black px-6 h-[60px] flex items-center justify-between shadow-sm">
        <h1 className="text-xl md:text-2xl font-bold tracking-wide">Calendar</h1>
      </header>

      <div className="p-8 flex-1 overflow-y-auto">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Room Availability</h2>
            <p className="text-gray-600 font-medium mt-1">
              {selectedDate.toLocaleDateString("en-PH", {
                timeZone: "Asia/Manila",
                year: "numeric",
                month: "long",
                day: "numeric",
                weekday: "long",
              })}
            </p>
          </div>

          <div>
            <button
              onClick={() => setShowModal(true)}
              className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#CC0000] shadow-sm bg-white hover:bg-gray-50"
            >
              Pick Date
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 border-4 border-[#CC0000] border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Loading room availability...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6 shadow-sm">
            <p className="text-red-700 font-medium">{error}</p>
          </div>
        ) : filteredRoomStatuses.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <p className="text-gray-500">No rooms available for this date</p>
          </div>
        ) : (
          ["Ground Floor", "2nd Floor", "4th Floor", "5th Floor"]
            .filter((f) => groupedByFloor[f])
            .map((floorName, fIdx) => {
              const rooms = groupedByFloor[floorName];
              return (
                <div
                  key={fIdx}
                  className="bg-white rounded-xl shadow-sm overflow-hidden mb-8 border border-gray-200 transition-all hover:shadow-md"
                >
                  <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="font-bold text-gray-800 text-lg">{floorName}</h3>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {rooms.map((room, rIdx) => {
                      const { status } = getRoomStatus(room);
                      const isRoomActive = room.isActive !== false;
                      const allReservations = [...(room.occupied || []), ...(room.pending || [])]
                        .sort((a, b) => new Date(a.start) - new Date(b.start));

                      return (
                        <div
                          key={rIdx}
                          className={`p-5 transition-colors duration-200 ${
                            status === 'occupied' ? "hover:bg-red-50" :
                            status === 'pending' ? "hover:bg-yellow-50" :
                            status === 'available' ? "hover:bg-green-50" :
                            "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-4">
                            {/* Room Info */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div
                                className={`w-3 h-3 rounded-full flex-shrink-0 ${
                                  status === 'inactive' ? "bg-gray-400" :
                                  status === 'occupied' ? "bg-red-500" :
                                  status === 'pending' ? "bg-yellow-500" : 
                                  "bg-green-500"
                                }`}
                              />
                              <p className={`font-medium text-gray-800 ${
                                !isRoomActive ? "text-gray-500" : ""
                              }`}>
                                {room.room || "Unnamed Room"}
                                {!isRoomActive && " (Inactive)"}
                              </p>
                            </div>

                            {/* Status and Reservations */}
                            <div className="text-right flex-shrink-0">
                              {status === 'inactive' ? (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 uppercase tracking-wide">
                                  Unavailable
                                </span>
                              ) : status === 'occupied' ? (
                                <div className="space-y-2">
                                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 uppercase tracking-wide">
                                    Occupied
                                  </span>
                                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                                    {allReservations.map((res, i) => (
                                      <div key={i} className="flex items-center justify-end gap-2">
                                        <span className={`font-mono bg-gray-100 px-2 py-1 rounded text-xs ${
                                          res.status === 'Pending' ? 'text-yellow-600 bg-yellow-50' : ''
                                        }`}>
                                          {formatTime(res.start)} – {formatTime(res.end)}
                                        </span>
                                        {res.mine && res.status === 'Pending' && (
                                          <span className="text-xs text-yellow-600">(Your Pending)</span>
                                        )}
                                        {res.mine && res.status === 'Approved' && (
                                          <span className="text-xs text-green-600">(Your Booking)</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : status === 'pending' ? (
                                <div className="space-y-2">
                                  <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800 uppercase tracking-wide">
                                    Pending
                                  </span>
                                  <div className="text-sm text-gray-600 mt-1 space-y-1">
                                    {room.pending.map((p, i) => (
                                      <div key={i} className="flex items-center justify-end gap-2">
                                        <span className="font-mono bg-yellow-50 px-2 py-1 rounded text-xs text-yellow-700">
                                          {formatTime(p.start)} – {formatTime(p.end)}
                                        </span>
                                        {p.mine && (
                                          <span className="text-xs text-yellow-600">(Your Request)</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 uppercase tracking-wide">
                                  Available
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
        )}
      </div>

      {/* Calendar Modal */}
      {showModal && (
        <CalendarModal
          selectedDate={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          onClose={() => setShowModal(false)}
        />
      )}
    </main>
  );
}

export default Calendar;