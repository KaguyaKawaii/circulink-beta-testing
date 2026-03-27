// components/user/UpcomingClosuresWidget.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Calendar, Clock, X, ChevronDown, ChevronUp, Building2 } from "lucide-react";

const UpcomingClosuresWidget = ({ user, setView }) => {
  const [closures, setClosures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedClosure, setSelectedClosure] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUpcomingClosures();
    
    // Listen for socket events for new closures
    if (window.socket) {
      window.socket.on("closure-created", () => {
        fetchUpcomingClosures();
      });
      window.socket.on("closure-updated", () => {
        fetchUpcomingClosures();
      });
      window.socket.on("closure-deleted", () => {
        fetchUpcomingClosures();
      });
    }
    
    return () => {
      if (window.socket) {
        window.socket.off("closure-created");
        window.socket.off("closure-updated");
        window.socket.off("closure-deleted");
      }
    };
  }, []);

  const fetchUpcomingClosures = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL || ''}/api/closures/upcoming`);
      // The response contains { success: true, closures: [...] }
      setClosures(response.data.closures || []);
    } catch (error) {
      console.error("Error fetching closures:", error);
      setError("Failed to load closures");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Helper function to convert time to 12-hour format
  const formatTimeTo12Hour = (timeString) => {
    if (!timeString) return '';
    
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getClosureStatus = (closure) => {
    const today = new Date().toISOString().split("T")[0];
    if (closure.date === today) {
      return { text: "Today", color: "text-red-600" };
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    if (closure.date === tomorrowStr) {
      return { text: "Tomorrow", color: "text-orange-600" };
    }
    return { text: formatDate(closure.date), color: "text-gray-500" };
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 sm:p-6 animate-pulse">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-5 w-5 bg-gray-200 rounded"></div>
          <div className="h-5 bg-gray-200 rounded w-40"></div>
        </div>
        <div className="space-y-3">
          <div className="h-16 bg-gray-100 rounded-xl"></div>
          <div className="h-16 bg-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 text-yellow-600">
          <AlertTriangle size={16} />
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (closures.length === 0) {
    return null;
  }

  // Filter to show only Active and Scheduled closures (not Expired or Deactivated)
  const activeAndScheduled = closures.filter(c => c.status === "Active" || c.status === "Scheduled");
  
  if (activeAndScheduled.length === 0) {
    return null;
  }

  const displayClosures = expanded ? activeAndScheduled : activeAndScheduled.slice(0, 2);
  const hasMore = activeAndScheduled.length > 2;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={18} />
            <h3 className="text-gray-800 font-bold text-sm sm:text-base">
              Upcoming Facility Closures ({activeAndScheduled.length})
            </h3>
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-red-600 hover:text-red-700 transition flex items-center gap-1 font-medium"
            >
              {expanded ? (
                <>
                  Show Less <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Show {activeAndScheduled.length - 2} More <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Closures List */}
      <div className="divide-y divide-gray-100">
        {displayClosures.map((closure) => {
          const status = getClosureStatus(closure);
          return (
            <div
              key={closure._id}
              className="p-4 sm:p-5 hover:bg-red-50/50 cursor-pointer transition-all duration-200"
              onClick={() => setSelectedClosure(closure)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-xs font-semibold ${status.color}`}>
                      {status.text}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatTimeTo12Hour(closure.startTime)} - {formatTimeTo12Hour(closure.endTime)}
                    </span>
                  </div>
                  <p className="text-gray-800 text-sm font-semibold mb-1 truncate">
                    {closure.title}
                  </p>
                  <p className="text-gray-500 text-xs line-clamp-2">
                    {closure.reason}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1">
                    {closure.affectedAllFloors ? (
                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                        <Building2 size={12} />
                        All Floors
                      </span>
                    ) : (
                      closure.affectedFloors?.slice(0, 3).map((floor, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full flex items-center gap-1">
                          <Building2 size={10} />
                          {floor}
                        </span>
                      ))
                    )}
                    {closure.affectedFloors?.length > 3 && (
                      <span className="text-xs text-gray-400 px-2 py-1">
                        +{closure.affectedFloors.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Closure Details Modal */}
      {selectedClosure && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fadeIn">
            <div className="flex justify-between items-center p-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-500" />
                {selectedClosure.title}
              </h3>
              <button
                onClick={() => setSelectedClosure(null)}
                className="p-1 hover:bg-gray-100 rounded-lg transition"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Status Badge */}
              <div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  selectedClosure.status === "Active" 
                    ? "bg-green-100 text-green-800" 
                    : "bg-blue-100 text-blue-800"
                }`}>
                  {selectedClosure.status === "Active" ? "Active Now" : "Scheduled"}
                </span>
              </div>
              
              {/* Date and Time */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{formatDate(selectedClosure.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} className="text-gray-400" />
                  <span>{formatTimeTo12Hour(selectedClosure.startTime)} - {formatTimeTo12Hour(selectedClosure.endTime)}</span>
                </div>
              </div>
              
              {/* Reason */}
              {selectedClosure.reason && (
                <div>
                  <p className="text-gray-600 text-sm whitespace-pre-wrap">
                    {selectedClosure.reason}
                  </p>
                </div>
              )}
              
              {/* Affected Areas */}
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium">Affected Areas:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedClosure.affectedAllFloors ? (
                    <span className="text-sm text-red-600 font-semibold flex items-center gap-1">
                      <Building2 size={14} />
                      All Floors
                    </span>
                  ) : (
                    selectedClosure.affectedFloors?.map((floor, idx) => (
                      <span key={idx} className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full flex items-center gap-1">
                        <Building2 size={10} />
                        {floor}
                      </span>
                    ))
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setSelectedClosure(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition text-sm font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default UpcomingClosuresWidget;