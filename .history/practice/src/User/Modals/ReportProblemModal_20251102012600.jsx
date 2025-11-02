import React, { useState, useEffect } from "react";
import axios from "axios";

const ReportProblemModal = ({ isOpen, onClose, user }) => {
  const [category, setCategory] = useState("Maintenance");
  const [details, setDetails] = useState("");
  const [floor, setFloor] = useState("");
  const [room, setRoom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [roomOptions, setRoomOptions] = useState({});
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [debugInfo, setDebugInfo] = useState(""); // For debugging

  const showLocationFields = ["Maintenance", "Equipment"].includes(category);

  // Fetch available rooms when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchAvailableRooms();
    }
  }, [isOpen]);

  const fetchAvailableRooms = async () => {
    try {
      setLoadingRooms(true);
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`);
      
      console.log("📊 Full API Response:", response.data); // Debug log
      
      // Transform the API response to match the expected format
      const roomsByFloor = transformRoomsData(response.data);
      setRoomOptions(roomsByFloor);
      
      // Debug info
      setDebugInfo(`Floors found: ${Object.keys(roomsByFloor).join(", ")} | Total rooms: ${response.data.length}`);
      console.log("🏢 Transformed room options:", roomsByFloor); // Debug log
      
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
      // Fallback to empty object if fetch fails
      setRoomOptions({});
      setDebugInfo("Error loading rooms");
      alert("Failed to load room data. Please try again.");
    } finally {
      setLoadingRooms(false);
    }
  };

  const transformRoomsData = (roomsData) => {
    const grouped = {};
    
    console.log("🔄 Transforming rooms data:", roomsData); // Debug log
    
    roomsData.forEach(room => {
      // Include ALL rooms (active and inactive) for reporting purposes
      if (room.floor && room.room) {
        if (!grouped[room.floor]) {
          grouped[room.floor] = [];
        }
        if (!grouped[room.floor].includes(room.room)) {
          grouped[room.floor].push(room.room);
        }
      } else {
        console.log("❌ Room filtered out (missing floor or room):", room);
      }
    });
    
    console.log("✅ Final grouped rooms:", grouped); // Debug log
    return grouped;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!details.trim()) {
      alert("Please provide issue details");
      return;
    }

    // Validate location fields for categories that require them
    if (showLocationFields && (!floor || !room)) {
      alert("Please select both floor and room for this category");
      return;
    }

    try {
      setIsSubmitting(true);

      const reportData = {
        reportedBy: user?.name || "Unknown User",
        userId: user?._id,
        category,
        details: details.trim(),
        floor: showLocationFields ? floor : "N/A",
        room: showLocationFields ? room : "N/A",
      };

      // Validate required fields
      if (!reportData.userId) {
        alert("User information is missing. Please log in again.");
        return;
      }

      await axios.post(`${import.meta.env.VITE_API_URL}/api/reports`, reportData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      setSuccess(true);
      setDetails("");
      setFloor("");
      setRoom("");

      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("❌ Failed to send report:", err);
      const errorMessage = err.response?.data?.message || "Failed to submit report. Please try again.";
      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    // Reset location fields when switching to non-location categories
    if (!["Maintenance", "Equipment"].includes(newCategory)) {
      setFloor("");
      setRoom("");
    }
  };

  const handleFloorChange = (newFloor) => {
    setFloor(newFloor);
    setRoom(""); // Reset room when floor changes
  };

  const availableRooms = roomOptions[floor] || [];

  // Reset form when modal closes
  const handleClose = () => {
    setCategory("Maintenance");
    setDetails("");
    setFloor("");
    setRoom("");
    setSuccess(false);
    setDebugInfo("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="bg-gradient-to-br from-white to-gray-50 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ">
        {/* Header */}
        <div className="bg-[#CC0000] px-6 py-5 flex justify-between items-center">
          <div className="flex items-center">
            <svg 
              className="w-6 h-6 mr-3 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
            <h2 className="text-xl font-semibold text-white">
              Report an Issue
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-white/80 hover:text-white transition-colors"
            disabled={isSubmitting}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          

          <form onSubmit={handleSubmit}>
            {/* Category */}
            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] transition-all outline-none appearance-none bg-white"
                  disabled={isSubmitting}
                >
                  <option value="Maintenance">Maintenance</option>
                  <option value="Security">Security</option>
                  <option value="Equipment">Equipment</option>
                  <option value="Other">Other</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Floor & Room Select */}
            {showLocationFields && (
              <>
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Floor
                  </label>
                  <div className="relative">
                    <select
                      value={floor}
                      onChange={(e) => handleFloorChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] transition-all outline-none appearance-none bg-white"
                      required={showLocationFields}
                      disabled={isSubmitting || loadingRooms}
                    >
                      <option value="">Select Floor</option>
                      {Object.keys(roomOptions).map((flr) => (
                        <option key={flr} value={flr}>
                          {flr}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      {loadingRooms ? (
                        <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  {loadingRooms && (
                    <p className="text-xs text-gray-500 mt-1">Loading rooms...</p>
                  )}
                 
                </div>

                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room
                  </label>
                  <div className="relative">
                    <select
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] transition-all outline-none appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required={showLocationFields}
                      disabled={!floor || isSubmitting || loadingRooms}
                    >
                      <option value="">Select Room</option>
                      {availableRooms.map((rm) => (
                        <option key={rm} value={rm}>
                          {rm}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                  {!floor && availableRooms.length === 0 && !loadingRooms && (
                    <p className="text-xs text-gray-500 mt-1">Please select a floor first</p>
                  )}
                  {floor && availableRooms.length === 0 && !loadingRooms && (
                    <p className="text-xs text-gray-500 mt-1">No rooms available for this floor</p>
                  )}
                </div>
              </>
            )}

            {/* Details */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Details
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none transition-all disabled:bg-gray-100"
                placeholder="Please describe the issue in detail..."
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Success Message */}
            {success && (
              <div className="mb-5 p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Report submitted successfully!
              </div>
            )}

            {/* Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-5 py-2.5 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2.5 text-white bg-[#CC0000] rounded-lg hover:bg-[#b10101] transition-all focus:outline-none focus:ring-2 focus:ring-[#CC0000] disabled:opacity-70 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ReportProblemModal;