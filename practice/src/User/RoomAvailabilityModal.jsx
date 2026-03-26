import React from "react";
import moment from "moment-timezone";

function RoomAvailabilityModal({
  selectedDate,
  roomStatuses = [],
  availLoading,
  availError,
  onClose,
  currentUserId = null,
  closures = [], // closures from the parent component
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

  // Helper to check if a specific room has an active closure at the selected time
  const getRoomClosureInfo = (room) => {
    if (!closures || closures.length === 0) return null;
    
    // Get active closures for this date
    const dateStr = selectedDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    
    const activeClosures = closures.filter(c => c.date === dateStr && c.status === "Active");
    
    for (const closure of activeClosures) {
      // Check if this closure affects the room
      const isRoomAffected = 
        closure.affectedAllFloors || 
        (closure.affectedFloors && closure.affectedFloors.includes(room.floor));
      
      if (isRoomAffected) {
        return closure;
      }
    }
    return null;
  };

  // Helper to check if a floor has active closure at selected time
  const getFloorClosureInfo = (floor) => {
    if (!closures || closures.length === 0) return null;
    
    // Get active closures for this date
    const dateStr = selectedDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    
    const activeClosures = closures.filter(c => c.date === dateStr && c.status === "Active");
    
    // Check if any closure affects this entire floor
    for (const closure of activeClosures) {
      if (closure.affectedAllFloors) {
        return closure;
      }
      if (closure.affectedFloors && closure.affectedFloors.includes(floor)) {
        return closure;
      }
    }
    return null;
  };

  // Filter room statuses based on user permissions and closures
  const getFilteredRoomStatus = (room) => {
    const isRoomActive = room.isActive !== false;
    const approvedOccupied = Array.isArray(room.occupied) ? room.occupied : [];
    const pendingReservations = Array.isArray(room.pending) ? room.pending : [];
    
    // Check if room has an active closure
    const roomClosure = getRoomClosureInfo(room);
    const isRoomClosedByClosure = !!roomClosure;
    
    // For all users, show approved/ongoing reservations
    // For pending reservations, only show if they belong to the current user
    const visiblePending = currentUserId 
      ? pendingReservations.filter(p => p.mine === true)
      : [];

    return {
      ...room,
      occupied: approvedOccupied,
      pending: visiblePending,
      isClosedByClosure: isRoomClosedByClosure,
      closureInfo: roomClosure
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
    const isClosedByClosure = room.isClosedByClosure === true;

    // CLOSURE TAKES HIGHEST PRIORITY
    if (isClosedByClosure) {
      return { status: 'closed', color: 'gray', isClosed: true };
    } else if (!isRoomActive) {
      return { status: 'inactive', color: 'gray' };
    } else if (hasOccupied) {
      return { status: 'occupied', color: 'red' };
    } else if (hasPending) {
      return { status: 'pending', color: 'yellow' };
    } else {
      return { status: 'available', color: 'green' };
    }
  };

  // Helper to check if any room in floor is affected by closure
  const hasAnyRoomClosure = (rooms) => {
    return rooms.some(room => room.isClosedByClosure === true);
  };

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
              <p className="text-gray-600 text-sm">Loading...</p>
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
              {["Ground Floor", "2nd Floor", "4th Floor", "5th Floor"].filter(f => groupedByFloor[f]).map((floorName, fIdx) => {
                const rooms = groupedByFloor[floorName];
                const floorClosure = getFloorClosureInfo(floorName);
                const hasRoomClosures = hasAnyRoomClosure(rooms);
                
                return (
                  <div key={fIdx} className={`border rounded-lg overflow-hidden ${(floorClosure || hasRoomClosures) ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
                    {/* Floor Header with Closure Badge */}
                    <div className={`px-3 py-2 border-b ${(floorClosure || hasRoomClosures) ? 'bg-red-100 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                      <div className="flex justify-between items-center">
                        <h3 className={`font-semibold text-sm ${(floorClosure || hasRoomClosures) ? 'text-red-700' : 'text-gray-800'}`}>
                          {floorName}
                        </h3>
                        {(floorClosure || hasRoomClosures) && (
                          <span className="text-xs bg-red-600 text-white px-2 py-1 rounded-full">
                            {floorClosure ? "Floor Closed" : "Has Closed Rooms"}
                          </span>
                        )}
                      </div>
                      {floorClosure && (
                        <p className="text-xs text-red-600 mt-1">
                          {floorClosure.title} • {floorClosure.startTime} - {floorClosure.endTime}
                        </p>
                      )}
                    </div>
                    
                    {/* Room List */}
                    <div className="divide-y divide-gray-100">
                      {rooms.map((room, rIdx) => {
                        const { status, isClosed } = getRoomStatus(room);
                        const isRoomActive = room.isActive !== false;
                        const allReservations = [...(room.occupied || []), ...(room.pending || [])]
                          .sort((a, b) => new Date(a.start) - new Date(b.start));
                        const roomClosure = room.closureInfo;

                        return (
                          <div key={rIdx} className={`p-3 ${isClosed ? 'bg-red-50/50' : ''}`}>
                            <div className="flex justify-between items-start gap-2">
                              {/* Room Info */}
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                  isClosed ? "bg-gray-400" :
                                  status === 'inactive' ? "bg-gray-400" :
                                  status === 'occupied' ? "bg-red-500" :
                                  status === 'pending' ? "bg-yellow-500" : "bg-green-500"
                                }`} />
                                <div>
                                  <p className={`font-medium text-sm truncate ${
                                    isClosed ? "text-gray-500 line-through" :
                                    !isRoomActive ? "text-gray-500" : "text-gray-900"
                                  }`}>
                                    {room.room}
                                    {!isRoomActive && " (Inactive)"}
                                  </p>
                                  {isClosed && roomClosure && (
                                    <p className="text-xs text-red-600 mt-0.5">
                                      {roomClosure.title}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Status */}
                              <div className="text-right flex-shrink-0">
                                {isClosed ? (
                                  <div className="space-y-1">
                                    <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded block">
                                      Room Closed
                                    </span>
                                    {roomClosure && (
                                      <span className="text-xs text-gray-500 block">
                                        {roomClosure.startTime}-{roomClosure.endTime}
                                      </span>
                                    )}
                                  </div>
                                ) : status === 'inactive' ? (
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Unavailable</span>
                                ) : status === 'occupied' ? (
                                  <div className="space-y-1">
                                    <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded block">Occupied</span>
                                    {allReservations.slice(0, 2).map((res, i) => (
                                      <span key={i} className={`text-xs px-2 py-1 rounded block ${
                                        res.status === 'Pending' 
                                          ? 'text-yellow-600 bg-yellow-50' 
                                          : 'text-gray-600 bg-white'
                                      }`}>
                                        {formatTime(res.start)}-{formatTime(res.end)}
                                        {res.mine && res.status === 'Pending' && ' (Your Pending)'}
                                        {res.mine && res.status === 'Approved' && ' (Your Booking)'}
                                      </span>
                                    ))}
                                    {allReservations.length > 2 && (
                                      <span className="text-xs text-gray-500">+{allReservations.length - 2} more</span>
                                    )}
                                  </div>
                                ) : status === 'pending' ? (
                                  <div className="space-y-1">
                                    <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded block">Pending</span>
                                    {room.pending.map((p, i) => (
                                      <span key={i} className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded block">
                                        {formatTime(p.start)}-{formatTime(p.end)}
                                        {p.mine && ' (Your Request)'}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">Available</span>
                                )}
                              </div>
                            </div>
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

export default RoomAvailabilityModal;