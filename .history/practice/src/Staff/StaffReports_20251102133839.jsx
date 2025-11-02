import React, { useState, useEffect } from "react";
import axios from "axios";
import StaffNavigation from "./StaffNavigation";
import { Eye, RefreshCw, Search, ChevronDown, X, CheckCircle, Clock, MapPin, FileText, User, Building, AlertTriangle, Play, CheckCircle as CheckCircleIcon } from "lucide-react";

function StaffReports({ setView, staff }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  // Handle sidebar state changes
  const handleSidebarStateChange = (isCollapsed) => {
    setSidebarCollapsed(isCollapsed);
  };

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    fetchReports();
  }, [staff?._id]);

  const fetchReports = () => {
    if (!staff?._id) return;
    
    setIsLoading(true);
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/reports/staff/${staff._id}`)
      .then((res) => {
        const sorted = res.data.sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt) : 0;
          const bTime = b.createdAt ? new Date(b.createdAt) : 0;
          return bTime - aTime;
        });
        setReports(sorted);
      })
      .catch((err) => {
        console.error("Fetch reports error:", err);
        setErrorMessage("Failed to fetch reports");
        setShowErrorModal(true);
      })
      .finally(() => setIsLoading(false));
  };

  const getStatusBadge = (status) => {
    const configs = {
      Pending: { 
        bg: "bg-yellow-50", 
        text: "text-yellow-800", 
        border: "border-yellow-200",
        dot: "bg-yellow-400"
      },
      "In Progress": { 
        bg: "bg-blue-50", 
        text: "text-blue-800", 
        border: "border-blue-200",
        dot: "bg-blue-400 animate-pulse"
      },
      Resolved: { 
        bg: "bg-green-50", 
        text: "text-green-800", 
        border: "border-green-200",
        dot: "bg-green-400"
      }
    };
    
    const config = configs[status] || configs.Pending;
    return {
      classes: `${config.bg} ${config.text} border ${config.border} inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-medium`,
      dot: config.dot
    };
  };

  const updateReportStatus = async (reportId, newStatus) => {
    try {
      if (newStatus === "In Progress") {
        await axios.post(`${import.meta.env.VITE_API_URL}/api/reports/${reportId}/start`, { 
          startedBy: staff?._id 
        });
      } else if (newStatus === "Resolved") {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${reportId}/resolve`, { 
          actionTaken: "Resolved by staff",
          resolvedBy: staff?._id 
        });
      } else {
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${reportId}/status`, { 
          status: newStatus,
          updatedBy: staff?._id 
        });
      }
      
      setSuccessMessage(`Report successfully marked as ${newStatus}`);
      setShowSuccessModal(true);
      fetchReports();
      setSelectedReport(null);
    } catch (err) {
      console.error("Failed to update report status:", err);
      setErrorMessage("Failed to update report status: " + (err.response?.data?.message || err.message));
      setShowErrorModal(true);
    }
  };

  // Filter out resolved reports that are older than 24 hours
  const shouldShowReport = (report) => {
    if (report.status === "Resolved") {
      const resolvedTime = report.updatedAt || report.createdAt;
      const now = new Date();
      const reportTime = new Date(resolvedTime);
      const hoursDiff = (now - reportTime) / (1000 * 60 * 60);
      
      return hoursDiff <= 24;
    }
    return true;
  };

  const filteredReports = reports.filter((report) => {
    const matchesStatus = filter === "All" || report.status === filter;
     if (report.status === "Archived") {
    return false;
  }
    const matchesSearch =
      (report.category || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (report.reportedBy || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (report.floor || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (report.room || "").toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (report.details || "").toLowerCase().includes(debouncedSearch.toLowerCase());
    const shouldShow = shouldShowReport(report);
    
    return matchesStatus && matchesSearch && shouldShow;
  });

  return (
    <>
      <StaffNavigation 
        setView={setView} 
        currentView="staffReports" 
        staff={staff} 
        onSidebarStateChange={handleSidebarStateChange}
      />
      
      {/* Responsive main content */}
      <main className={`min-h-screen bg-gray-50 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-[70px] lg:w-[calc(100%-70px)]' : 'lg:ml-[250px] lg:w-[calc(100%-250px)]'
      } ml-0 w-full`}>
        
        {/* Header */}
        <header className="bg-white px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#CC0000]">
                Assigned Reports
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                Manage and resolve reports assigned to you
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>
        </header>

        {/* Rest of the StaffReports component remains the same */}
        <div className="p-3 sm:p-4 lg:p-6">
          {/* Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-xl shadow-sm border border-gray-100 mb-4 sm:mb-6">
            {/* Filter Chips */}
            <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
              {["All", "Pending", "In Progress", "Resolved"].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-colors ${
                    filter === status
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
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
                  placeholder="Search reports..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  aria-label="Search reports"
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

              {/* Refresh */}
              <button
                onClick={fetchReports}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base w-full sm:w-auto"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Reports Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-3 sm:mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
              <div className="w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">
                {reports.length === 0 ? "No Reports Assigned" : "No Matching Reports"}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-4 sm:mb-6 text-sm sm:text-base">
                {reports.length === 0 
                  ? "You'll see reports here once they're assigned to you." 
                  : "Try adjusting your search criteria or filters."}
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm sm:text-base"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {filteredReports.map((report, index) => {
                const statusConfig = getStatusBadge(report.status);
                return (
                  <div
                    key={`${report._id}-${index}`}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div className="p-4 sm:p-6">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-0 mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-800 text-base sm:text-lg truncate">
                            {report.category}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1 truncate">
                            Reported by {report.reportedBy}
                          </p>
                        </div>
                        <span className={statusConfig.classes}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${statusConfig.dot}`}></span>
                          <span className="whitespace-nowrap">{report.status}</span>
                        </span>
                      </div>

                      {/* Location */}
                      <div className="mb-3 sm:mb-4">
                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                          <span className="font-medium">Location:</span> {report.floor} - {report.room}
                        </p>
                      </div>

                      {/* Details Preview */}
                      <div className="mb-3 sm:mb-4">
                        <p className="text-xs sm:text-sm text-gray-700 line-clamp-3">
                          {report.details}
                        </p>
                      </div>

                      {/* Date */}
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {formatPHDateTime(report.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="bg-gray-50 px-4 sm:px-6 py-3 border-t border-gray-200">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs sm:text-sm transition-colors"
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </button>
                        
                        {report.status === "Pending" && (
                          <button
                            onClick={() => updateReportStatus(report._id, "In Progress")}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm transition-colors"
                          >
                            <Play size={14} />
                            <span>Start</span>
                          </button>
                        )}
                        
                        {report.status === "In Progress" && (
                          <button
                            onClick={() => updateReportStatus(report._id, "Resolved")}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm transition-colors"
                          >
                            <CheckCircleIcon size={14} />
                            <span>Resolve</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Report Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100000] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Report Details</h2>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Status Badge */}
              <div className="mb-6">
                <span className={getStatusBadge(selectedReport.status).classes}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${getStatusBadge(selectedReport.status).dot}`}></span>
                  {selectedReport.status}
                </span>
              </div>

              {/* Report Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Category</label>
                      <p className="text-gray-900">{selectedReport.category}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Details</label>
                      <p className="text-gray-900 whitespace-pre-wrap">{selectedReport.details}</p>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Priority</label>
                      <p className="text-gray-900 capitalize">{selectedReport.priority || "Normal"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Location & Contact</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-500">Location</label>
                      <div className="flex items-center gap-2 text-gray-900">
                        <MapPin size={16} className="text-gray-400" />
                        <span>{selectedReport.floor} - {selectedReport.room}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Reported By</label>
                      <div className="flex items-center gap-2 text-gray-900">
                        <User size={16} className="text-gray-400" />
                        <span>{selectedReport.reportedBy}</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium text-gray-500">Contact</label>
                      <p className="text-gray-900">{selectedReport.contact || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Report Created</p>
                      <p className="text-xs text-gray-500">{formatPHDateTime(selectedReport.createdAt)}</p>
                    </div>
                  </div>
                  
                  {selectedReport.status === "In Progress" && selectedReport.startedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Work Started</p>
                        <p className="text-xs text-gray-500">{formatPHDateTime(selectedReport.startedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {selectedReport.status === "Resolved" && selectedReport.resolvedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Resolved</p>
                        <p className="text-xs text-gray-500">{formatPHDateTime(selectedReport.resolvedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col sm:flex-row gap-3">
                {selectedReport.status === "Pending" && (
                  <button
                    onClick={() => updateReportStatus(selectedReport._id, "In Progress")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Play size={18} />
                    <span>Start Working on This</span>
                  </button>
                )}
                
                {selectedReport.status === "In Progress" && (
                  <button
                    onClick={() => updateReportStatus(selectedReport._id, "Resolved")}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <CheckCircleIcon size={18} />
                    <span>Mark as Resolved</span>
                  </button>
                )}
                
                <button
                  onClick={() => setSelectedReport(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <X size={18} />
                  <span>Close</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100001] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Success</h3>
            </div>
            <p className="text-gray-600 mb-6">{successMessage}</p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100001] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4 transform transition-all duration-300 scale-100">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Error</h3>
            </div>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => setShowErrorModal(false)}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default StaffReports;