// components/user/UpcomingClosuresWidget.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import { AlertTriangle, Calendar, Clock, X, ChevronDown, ChevronUp } from "lucide-react";

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

  const getClosureStatus = (closure) => {
    const today = new Date().toISOString().split("T")[0];
    if (closure.date === today) {
      return { text: "Today", color: "text-red-400" };
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];
    if (closure.date === tomorrowStr) {
      return { text: "Tomorrow", color: "text-orange-400" };
    }
    return { text: formatDate(closure.date), color: "text-gray-400" };
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-5 w-5 bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-700 rounded w-32"></div>
        </div>
        <div className="space-y-2">
          <div className="h-12 bg-gray-700 rounded"></div>
          <div className="h-12 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center gap-2 text-yellow-500">
          <AlertTriangle size={16} />
          <p className="text-sm text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (closures.length === 0) {
    return null;
  }

  const displayClosures = expanded ? closures : closures.slice(0, 2);
  const hasMore = closures.length > 2;

  return (
    <div className="bg-gradient-to-r from-red-900/20 to-orange-900/20 border border-red-500/30 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-red-600/20 px-4 py-3 border-b border-red-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={18} />
            <h3 className="text-white font-semibold text-sm">
              Upcoming Facility Closures ({closures.length})
            </h3>
          </div>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-red-300 hover:text-red-200 transition flex items-center gap-1"
            >
              {expanded ? (
                <>
                  Show Less <ChevronUp size={14} />
                </>
              ) : (
                <>
                  Show {closures.length - 2} More <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Closures List */}
      <div className="divide-y divide-red-500/20">
        {displayClosures.map((closure) => {
          const status = getClosureStatus(closure);
          return (
            <div
              key={closure._id}
              className="p-3 hover:bg-red-900/20 cursor-pointer transition"
              onClick={() => setSelectedClosure(closure)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-xs font-semibold ${status.color}`}>
                      {status.text}
                    </span>
                    <span className="text-xs text-gray-400">
                      {closure.startTime} - {closure.endTime}
                    </span>
                  </div>
                  <p className="text-white text-sm font-medium mb-1 truncate">
                    {closure.title}
                  </p>
                  <p className="text-gray-400 text-xs line-clamp-2">
                    {closure.reason}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {closure.affectedAllRooms ? (
                      <span className="text-xs bg-red-800/50 text-red-200 px-2 py-0.5 rounded">
                        All Rooms
                      </span>
                    ) : (
                      closure.affectedRooms?.slice(0, 3).map((room, idx) => (
                        <span key={idx} className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                          {room}
                        </span>
                      ))
                    )}
                    {closure.affectedRooms?.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{closure.affectedRooms.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* View All Button */}
      {closures.length > 0 && (
        <div className="p-3 border-t border-red-500/20 bg-red-900/10">
          <button
            onClick={() => setView?.("calendar")}
            className="w-full text-center text-xs text-red-300 hover:text-red-200 transition py-1"
          >
            View All in Calendar
          </button>
        </div>
      )}

      {/* Closure Details Modal */}
      {selectedClosure && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100000] p-4">
          <div className="bg-gray-800 rounded-xl max-w-md w-full shadow-xl animate-fadeIn">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle size={20} className="text-red-400" />
                {selectedClosure.title}
              </h3>
              <button
                onClick={() => setSelectedClosure(null)}
                className="p-1 hover:bg-gray-700 rounded-lg transition"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {/* Date and Time */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar size={16} className="text-gray-400" />
                  <span>{formatDate(selectedClosure.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock size={16} className="text-gray-400" />
                  <span>{selectedClosure.startTime} - {selectedClosure.endTime}</span>
                </div>
              </div>
              
              {/* Reason */}
              <div>
                <p className="text-gray-300 text-sm whitespace-pre-wrap">
                  {selectedClosure.reason}
                </p>
              </div>
              
              {/* Affected Areas */}
              <div className="bg-gray-700 rounded-lg p-3">
                <p className="text-xs text-gray-400 mb-2">Affected Areas:</p>
                <div className="flex flex-wrap gap-1">
                  {selectedClosure.affectedAllRooms ? (
                    <span className="text-sm text-red-300 font-medium">All Rooms</span>
                  ) : (
                    selectedClosure.affectedRooms?.map((room, idx) => (
                      <span key={idx} className="text-xs bg-gray-600 text-gray-300 px-2 py-1 rounded">
                        {room}
                      </span>
                    ))
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedClosure(null);
                    if (setView) setView("calendar");
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition text-sm"
                >
                  View Calendar
                </button>
                <button
                  onClick={() => setSelectedClosure(null)}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition text-sm"
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