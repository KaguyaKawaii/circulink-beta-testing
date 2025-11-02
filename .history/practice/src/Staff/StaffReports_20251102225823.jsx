import React, { useState, useEffect } from "react";
import axios from "axios";
import StaffNavigation from "./StaffNavigation";
import { Eye, RefreshCw, Search, ChevronDown, X, CheckCircle, Clock, MapPin, FileText, User, Building, AlertTriangle, Play, CheckCircle as CheckCircleIcon } from "lucide-react";

function StaffReports({ setView, staff, onLogout }) {
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
<StaffNavigation setView={setView} currentView="staffReports" staff={staff} onLogout={onLogout} />
      <main className="ml-0 lg:ml-[250px] w-full lg:w-[calc(100%-250px)] min-h-screen bg-gray-50">
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

        {/* Main Content */}
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
                    <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="flex items-center justify-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors text-xs sm:text-sm w-full sm:w-auto"
                        >
                          <Eye size={14} />
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Report Details Modal */}
      {selectedReport && (
        <ReportModal
          report={selectedReport}
          formatPHDateTime={formatPHDateTime}
          onClose={() => setSelectedReport(null)}
          onStatusUpdate={updateReportStatus}
          staff={staff}
        />
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">{successMessage}</p>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
              <p className="text-gray-600 mb-6">{errorMessage}</p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Helper functions for the new report modal design
const getModalStatusConfig = (status) => {
  const configs = {
    Pending: { 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      icon: <Clock size={16} />,
      dot: "bg-amber-400"
    },
    "In Progress": { 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      icon: <Play size={16} />,
      dot: "bg-blue-400 animate-pulse"
    },
    Resolved: { 
      color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
      icon: <CheckCircleIcon size={16} />,
      dot: "bg-emerald-400"
    },
    Archived: { 
      color: "bg-gray-100 text-gray-800 border-gray-300", 
      icon: <X size={16} />,
      dot: "bg-gray-400"
    }
  };
  return configs[status] || configs.Pending;
};

const InfoCard = ({ title, value, icon, subtitle }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 hover:shadow-sm transition-all duration-200">
    <div className="flex items-center justify-between">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 truncate">{title}</p>
        <p className="text-base sm:text-lg font-semibold text-gray-900 truncate">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
      </div>
      <div className="p-2 rounded-lg bg-gray-100 text-gray-600 ml-3 flex-shrink-0">
        {icon}
      </div>
    </div>
  </div>
);

function ReportModal({
  report,
  formatPHDateTime,
  onClose,
  onStatusUpdate,
  staff
}) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [actionTaken, setActionTaken] = useState("");

  const handleStatusUpdate = (reportId, newStatus) => {
    if (newStatus === "Resolved") {
      setPendingStatus(newStatus);
      setShowConfirmModal(true);
    } else {
      onStatusUpdate(reportId, newStatus);
    }
  };

  const confirmStatusUpdate = () => {
    if (pendingStatus === "Resolved") {
      onStatusUpdate(report._id, pendingStatus);
    } else {
      onStatusUpdate(report._id, pendingStatus);
    }
    setShowConfirmModal(false);
    setPendingStatus(null);
    setActionTaken("");
  };

  const cancelStatusUpdate = () => {
    setShowConfirmModal(false);
    setPendingStatus(null);
    setActionTaken("");
  };

  const statusConfig = getModalStatusConfig(report.status);

  return (
    <>
      {/* Report Modal */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-white p-4 sm:p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 sm:gap-0 mb-4">
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-red-100 rounded-xl flex items-center justify-center border border-red-300 flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 truncate">Report Details</h1>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-gray-600">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Building size={14} />
                      <span className="truncate">{report.floor} • {report.room}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                      <Clock size={14} />
                      <span className="truncate">{report.createdAt ? formatPHDateTime(report.createdAt) : "N/A"}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-xs sm:text-sm font-medium ${statusConfig.color}`}>
                  <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`}></span>
                  {statusConfig.icon}
                  <span className="whitespace-nowrap">{report.status}</span>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 flex-shrink-0"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 overflow-y-auto max-h-[50vh] sm:max-h-[60vh] bg-gray-50">
            <div className="space-y-4 sm:space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <InfoCard
                  title="Category"
                  value={report.category || "N/A"}
                  icon={<FileText size={18} />}
                  subtitle="Issue type"
                />
                <InfoCard
                  title="Reported By"
                  value={report.reportedBy || "N/A"}
                  icon={<User size={18} />}
                  subtitle="Reporter"
                />
                <InfoCard
                  title="Status"
                  value={report.status || "N/A"}
                  icon={<AlertTriangle size={18} />}
                  subtitle="Current status"
                />
              </div>

              {/* Location & Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {/* Location Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <MapPin size={18} className="text-gray-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Location Details</h3>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <div className="flex items-center justify-between py-1 sm:py-2">
                      <span className="text-gray-600 text-sm sm:text-base">Floor</span>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">{report.floor || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 sm:py-2">
                      <span className="text-gray-600 text-sm sm:text-base">Room</span>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">{report.room || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between py-1 sm:py-2">
                      <span className="text-gray-600 text-sm sm:text-base">Date Reported</span>
                      <span className="font-semibold text-gray-900 text-sm sm:text-base">{formatPHDateTime(report.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Issue Details Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <AlertTriangle size={18} className="text-gray-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Issue Details</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-3 sm:p-4 rounded-lg border border-gray-200 text-sm sm:text-base">
                    {report.details || "No description provided"}
                  </p>
                </div>
              </div>

              {/* Report Timeline */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Report Timeline</h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm text-gray-600">Report created</span>
                    <span className="text-xs sm:text-sm text-gray-400 ml-auto text-right">{formatPHDateTime(report.createdAt)}</span>
                  </div>
                  {report.startedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm text-gray-600">Work started</span>
                      <span className="text-xs sm:text-sm text-gray-400 ml-auto text-right">{formatPHDateTime(report.startedAt)}</span>
                    </div>
                  )}
                  {report.resolvedAt && (
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></div>
                      <span className="text-xs sm:text-sm text-gray-600">Report resolved</span>
                      <span className="text-xs sm:text-sm text-gray-400 ml-auto text-right">{formatPHDateTime(report.resolvedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Taken (if resolved) */}
              {report.status === "Resolved" && report.actionTaken && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircleIcon size={18} className="text-green-600" />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">Action Taken</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed bg-green-50 p-3 sm:p-4 rounded-lg border border-green-200 text-sm sm:text-base">
                    {report.actionTaken}
                  </p>
                  {report.resolvedAt && (
                    <div className="mt-2 sm:mt-3 text-xs sm:text-sm text-gray-500">
                      Resolved on: {formatPHDateTime(report.resolvedAt)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              <div className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                {report.status === "Pending" && "Ready to start working on this report?"}
                {report.status === "In Progress" && "Have you completed this task?"}
              </div>
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="text-xs sm:text-sm text-gray-600 order-2 sm:order-1">
                  <span className="font-medium">Report ID:</span>{" "}
                  <span className="font-mono text-gray-800">{report?._id?.slice(-8)}</span>
                </div>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-end order-1 sm:order-2 w-full sm:w-auto">
                  <button
                    onClick={onClose}
                    className="px-3 sm:px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-xs sm:text-sm flex-1 sm:flex-none min-w-[80px]"
                  >
                    Close
                  </button>
                  
                  {report.status === "Pending" && (
                    <button
                      onClick={() => handleStatusUpdate(report._id, "In Progress")}
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 flex-1 sm:flex-none min-w-[120px]"
                    >
                      <Play size={14} />
                      Start Work
                    </button>
                  )}

                  {report.status === "In Progress" && (
                    <button
                      onClick={() => handleStatusUpdate(report._id, "Resolved")}
                      className="px-3 sm:px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 font-medium text-xs sm:text-sm flex items-center justify-center gap-2 flex-1 sm:flex-none min-w-[120px]"
                    >
                      <CheckCircleIcon size={14} />
                      Mark Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl overflow-hidden">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Confirm Action</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to mark this report as resolved? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelStatusUpdate}
                  className="flex-1 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmStatusUpdate}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default StaffReports;