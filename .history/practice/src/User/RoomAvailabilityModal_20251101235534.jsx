import React from "react";
import moment from "moment-timezone";

function RoomAvailabilityModal({
  selectedDate,
  roomStatuses = [],
  availLoading,
  availError,
  onClose,
}) {

  React.useEffect(() => {
    console.log("📊 Room Statuses Data:", roomStatuses);
    console.log("🔍 Inactive Rooms:", roomStatuses.filter(room => room.isActive === false));
  }, [roomStatuses]);

  const formatTime = (iso) => {
    return moment(iso).tz("Asia/Manila").format("hh:mm A");
  };

  const groupedByFloor = roomStatuses.reduce((acc, room) => {
    const floor = room.floor || "Unknown Floor";
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(room);
    return acc;
  }, {});

  // Add escape key handler
  React.useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Enhanced Header */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Room Availability
                </h2>
                <p className="text-gray-600 font-medium mt-1 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {selectedDate.toLocaleDateString("en-PH", {
                    timeZone: "Asia/Manila",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </p>
              </div>
            </div>
            <button
              className="text-gray-500 hover:text-red-500 transition-all duration-200 p-2 rounded-full hover:bg-white/80 cursor-pointer shadow-sm"
              onClick={onClose}
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Enhanced Content */}
        <div className="flex-1 overflow-y-auto">
          {availLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-14 h-14 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-600 text-lg font-medium">Loading room availability...</p>
              <p className="text-gray-400 text-sm mt-2">Please wait a moment</p>
            </div>
          ) : availError ? (
            <div className="m-6 bg-red-50 border border-red-200 rounded-xl p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">Unable to Load Data</h3>
              <p className="text-red-600">{availError}</p>
              <button
                onClick={onClose}
                className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors duration-200"
              >
                Try Again
              </button>
            </div>
          ) : roomStatuses.length === 0 ? (
            <div className="text-center py-16 px-6">
              <div className="mx-auto w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No rooms available</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                There are no rooms to display for the selected date. Please try selecting a different date.
              </p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {["Ground Floor", "2nd Floor", "4th Floor", "5th Floor"].filter(f => groupedByFloor[f]).map((floorName, fIdx) => {
                const rooms = groupedByFloor[floorName];
                return (
                  <div
                    key={fIdx}
                    className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200/80 hover:shadow-md transition-shadow duration-200"
                  >
                    {/* Enhanced Floor Header */}
                    <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100/80 border-b border-gray-200">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-white rounded-lg shadow-sm">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg">{floorName}</h3>
                        <span className="px-2.5 py-1 bg-gray-200/60 text-gray-600 text-xs font-medium rounded-full">
                          {rooms.length} {rooms.length === 1 ? 'room' : 'rooms'}
                        </span>
                      </div>
                    </div>
                    
                    {/* Enhanced Room List */}
                    <div className="divide-y divide-gray-100/80">
                      {rooms.map((room, rIdx) => {
                        const isOccupied = Array.isArray(room.occupied) && room.occupied.length > 0;
                        const isRoomActive = room.isActive !== false;

                        return (
                          <div
                            key={rIdx}
                            className={`p-5 transition-all duration-200 ${
                              !isRoomActive 
                                ? "bg-gray-50/50 hover:bg-gray-100/50" 
                                : isOccupied 
                                ? "bg-red-50/30 hover:bg-red-100/20" 
                                : "bg-green-50/30 hover:bg-green-100/20"
                            }`}
                          >
                            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                              {/* Room Info */}
                              <div className="flex items-start gap-3 flex-1">
                                <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 ${
                                  !isRoomActive ? "bg-gray-400" :
                                  isOccupied ? "bg-red-500" : "bg-green-500"
                                }`} />
                                <div className="flex-1 min-w-0">
                                  <p className={`font-semibold text-lg truncate ${
                                    !isRoomActive ? "text-gray-500" : "text-gray-900"
                                  }`}>
                                    {room.room || "Unnamed Room"}
                                    {!isRoomActive && (
                                      <span className="ml-2 text-sm font-normal text-gray-400">(Inactive)</span>
                                    )}
                                  </p>
                                  {isRoomActive && isOccupied && room.occupied.length > 0 && (
                                    <p className="text-sm text-gray-600 mt-1">
                                      {room.occupied.length} scheduled {room.occupied.length === 1 ? 'event' : 'events'}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Status & Actions */}
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                {/* Status Badge */}
                                <div className="flex-shrink-0">
                                  {!isRoomActive ? (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-gray-100 text-gray-700">
                                      <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                                      Unavailable
                                    </span>
                                  ) : isOccupied ? (
                                    <div className="text-right">
                                      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-800 mb-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                                        Occupied
                                      </span>
                                      <div className="space-y-2">
                                        {room.occupied.map((o, i) => (
                                          <div
                                            key={i}
                                            className="flex flex-wrap justify-end items-center gap-2"
                                          >
                                            <span className="bg-white/80 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 shadow-sm">
                                              {formatTime(o.start)} – {formatTime(o.end)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-green-100 text-green-800">
                                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                      Available
                                    </span>
                                  )}
                                </div>
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
        
        {/* Enhanced Footer */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-200 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {!availLoading && roomStatuses.length > 0 && (
              <span>Total: {roomStatuses.length} rooms across {Object.keys(groupedByFloor).length} floors</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-medium rounded-lg transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default RoomAvailabilityModal;