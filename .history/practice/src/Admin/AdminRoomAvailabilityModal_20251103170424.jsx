import React from "react";
import moment from "moment-timezone";

function AdminRoomAvailabilityModal({
  selectedDate,
  roomStatuses = [],
  availLoading,
  availError,
  onClose,
  currentUserId = null,
}) {

  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const formatTime = (iso) => {
    return moment(iso).tz("Asia/Manila").format("hh:mm A");
  };

  // Filter room statuses for admin view - show both approved and pending reservations
  const getFilteredRoomStatus = (room) => {
    const isRoomActive = room.isActive !== false;
    const approvedOccupied = Array.isArray(room.occupied) ? room.occupied : [];
    const pendingReservations = Array.isArray(room.pending) ? room.pending : [];
    
    // For admin view, show both approved and pending reservations
    const adminView = {
      ...room,
      occupied: approvedOccupied,
      pending: pendingReservations,
      // Include all reservation data for admin
    };

    return adminView;
  };

  const filteredRoomStatuses = roomStatuses.map(getFilteredRoomStatus);

  // Group rooms by floor
  const groupedByFloor = filteredRoomStatuses.reduce((acc, room) => {
    const floor = room.floor || "Unknown Floor";
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  // Helper function to determine room status (consider both approved and pending)
  const getRoomStatus = (room) => {
    const isRoomActive = room.isActive !== false;
    const hasOccupied = Array.isArray(room.occupied) && room.occupied.length > 0;
    const hasPending = Array.isArray(room.pending) && room.pending.length > 0;

    if (!isRoomActive) {
      return { status: 'inactive', color: 'gray' };
    } else if (hasOccupied) {
      return { status: 'occupied', color: 'red' };
    } else if (hasPending) {
      return { status: 'pending', color: 'amber' };
    } else {
      return { status: 'available', color: 'green' };
    }
  };

  // Get all unique floors from the room data
  const allFloors = Object.keys(groupedByFloor).sort((a, b) => {
    const floorOrder = {
      "Ground Floor": 0,
      "2nd Floor": 1,
      "4th Floor": 2,
      "5th Floor": 3
    };
    return (floorOrder[a] || 999) - (floorOrder[b] || 999);
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[95vh] overflow-hidden shadow-xl flex flex-col">
        {/* Compact Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-800">Room Availability</h2>
              <p className="text-sm text-gray-600 mt-0.5">
                {selectedDate.toLocaleDateString("en-PH", {
                  timeZone: "Asia/Manila",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Compact Content */}
        <div className="flex-1 overflow-y-auto p-3">
          {availLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-gray-600 text-sm">Loading room availability...</p>
            </div>
          ) : availError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-700 text-sm">{availError}</p>
            </div>
          ) : filteredRoomStatuses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No rooms available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allFloors.map((floorName, fIdx) => {
                const rooms = groupedByFloor[floorName] || [];
                return (
                  <div key={fIdx} className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Floor Header */}
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-800 text-sm">{floorName}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    
                    {/* Room List */}
                    <div className="divide-y divide-gray-100">
                      {rooms.map((room, rIdx) => {
                        const { status, color } = getRoomStatus(room);
                        const isRoomActive = room.isActive !== false;
                        const hasPending = Array.isArray(room.pending) && room.pending.length > 0;

                        return (
                          <div key={rIdx} className="p-3">
                            <div className="flex justify-between items-start gap-2">
                              {/* Room Info */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  status === 'inactive' ? "bg-gray-400" :
                                  status === 'occupied' ? "bg-red-500" :
                                  status === 'pending' ? "bg-amber-500" : "bg-green-500"
                                }`} />
                                <p className={`font-medium text-sm truncate ${
                                  !isRoomActive ? "text-gray-500" : "text-gray-900"
                                }`}>
                                  {room.room}
                                  {!isRoomActive && " (Inactive)"}
                                </p>
                              </div>

                              {/* Status */}
                              <div className="text-right flex-shrink-0">
                                {status === 'inactive' ? (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Unavailable</span>
                                ) : status === 'occupied' ? (
                                  <div className="space-y-1">
                                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded block">Occupied</span>
                                    {room.occupied.slice(0, 2).map((o, i) => (
                                      <span key={i} className="text-xs text-gray-600 bg-white px-2 py-1 rounded block">
                                        {formatTime(o.start)}-{formatTime(o.end)}
                                      </span>
                                    ))}
                                    {room.occupied.length > 2 && (
                                      <span className="text-xs text-gray-500">+{room.occupied.length - 2} more</span>
                                    )}
                                  </div>
                                ) : status === 'pending' ? (
                                  <div className="space-y-1">
                                    <span className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded block">Pending Approval</span>
                                    {room.pending.slice(0, 2).map((p, i) => (
                                      <span key={i} className="text-xs text-gray-600 bg-white px-2 py-1 rounded block">
                                        {formatTime(p.start)}-{formatTime(p.end)}
                                      </span>
                                    ))}
                                    {room.pending.length > 2 && (
                                      <span className="text-xs text-gray-500">+{room.pending.length - 2} more</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Available</span>
                                )}
                              </div>
                            </div>

                            {/* Additional info for admin */}
                            {(room.occupied?.length > 0 || room.pending?.length > 0) && (
                              <div className="mt-2 pt-2 border-t border-gray-100">
                                <div className="flex justify-between text-xs text-gray-500">
                                  <span>
                                    Approved: {room.occupied?.length || 0}
                                  </span>
                                  <span>
                                    Pending: {room.pending?.length || 0}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Legend */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4 justify-center text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Available</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Occupied</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <span className="text-gray-600">Pending</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              <span className="text-gray-600">Inactive</span>
            </div>
          </div>
        </div>

        {/* Compact Footer */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors text-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default AdminRoomAvailabilityModal;