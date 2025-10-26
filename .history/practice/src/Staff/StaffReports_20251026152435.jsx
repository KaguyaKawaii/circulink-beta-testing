import React, { useState, useEffect } from "react";
import axios from "axios";
import StaffNavigation from "./StaffNavigation";
import { Eye, RefreshCw, Search, ChevronDown, X, CheckCircle, Clock, MapPin, FileText, User, Building, AlertTriangle, Play, CheckCircle as CheckCircleIcon } from "lucide-react";

function StaffReports({ setView, staff }) {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
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
    const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
    switch (status) {
      case "Pending":
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case "Resolved":
        return `${baseClasses} bg-green-100 text-green-800`;
      case "Archived":
        return `${baseClasses} bg-gray-100 text-gray-800`;
      case "In Progress":
        return `${baseClasses} bg-blue-100 text-blue-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  const updateReportStatus = async (reportId, newStatus) => {
    try {
      // FIXED: Use the correct endpoint format
      if (newStatus === "In Progress") {
        // Use the start endpoint for "In Progress"
        await axios.post(`${import.meta.env.VITE_API_URL}/api/reports/${reportId}/start`, { 
          startedBy: staff?._id 
        });
      } else if (newStatus === "Resolved") {
        // Use the resolve endpoint for "Resolved"
        await axios.put(`${import.meta.env.VITE_API_URL}/api/reports/${reportId}/resolve`, { 
          actionTaken: "Resolved by staff", // You might want to make this dynamic
          resolvedBy: staff?._id 
        });
      } else {
        // Use status endpoint for other status changes
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
      
      // Hide resolved reports older than 24 hours
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
      (report.category || "").toLowerCase().includes(search.toLowerCase()) ||
      (report.reportedBy || "").toLowerCase().includes(search.toLowerCase()) ||
      (report.floor || "").toLowerCase().includes(search.toLowerCase()) ||
      (report.room || "").toLowerCase().includes(search.toLowerCase()) ||
      (report.details || "").toLowerCase().includes(search.toLowerCase());
    const shouldShow = shouldShowReport(report);
    
    return matchesStatus && matchesSearch && shouldShow;
  });

  return (
    <>
      <StaffNavigation setView={setView} currentView="staffReports" staff={staff} />
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[#CC0000]">
                Assigned Reports
              </h1>
              <p className="text-gray-600">
                Manage and resolve reports assigned to you
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
                  placeholder="Search reports by category, location, or details..."
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
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
                <ChevronDown
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>

              {/* Refresh */}
              <button
                onClick={fetchReports}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <RefreshCw size={16} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Reports Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 text-lg">Loading reports...</div>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <div className="text-gray-500 text-lg">No reports found</div>
                <p className="text-gray-400 mt-2">
                  {reports.length === 0 ? "No reports have been assigned to you yet." : "No reports match your search criteria."}
                </p>
              </div>
            ) : (
              filteredReports.map((report, index) => (
                <div
                  key={`${report._id}-${index}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-800 text-lg">
                          {report.category}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Reported by {report.reportedBy}
                        </p>
                      </div>
                      <span className={getStatusBadge(report.status)}>
                        {report.status}
                      </span>
                    </div>

                    {/* Location */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Location:</span> {report.floor} - {report.room}
                      </p>
                    </div>

                    {/* Details Preview */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {report.details}
                      </p>
                    </div>

                    {/* Priority and Date */}
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {formatPHDateTime(report.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye size={16} />
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Report Details Modal - Updated with notification design */}
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
const getStatusConfig = (status) => {
  const configs = {
    Pending: { 
      color: "bg-amber-100 text-amber-800 border-amber-200", 
      icon: <Clock size={16} />,
    },
    "In Progress": { 
      color: "bg-blue-100 text-blue-800 border-blue-200", 
      icon: <Play size={16} />,
    },
    Resolved: { 
      color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
      icon: <CheckCircleIcon size={16} />,
    },
    Archived: { 
      color: "bg-gray-100 text-gray-800 border-gray-300", 
      icon: <X size={16} />,
    }
  };
  return configs[status] || configs.Pending;
};

const InfoCard = ({ title, value, icon, subtitle }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-all duration-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
        <p className="text-lg font-semibold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
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
    // For resolved reports, we need to pass actionTaken
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

  return (
    <>
      {/* Report Modal - Updated with notification design */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-gray-200">
          {/* Header */}
          <div className="bg-white p-6 border-b border-gray-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center border border-red-300">
                  <AlertTriangle size={24} className="text-red-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-1">Report Details</h1>
                  <div className="flex items-center gap-3 text-gray-600">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Building size={16} />
                      {report.floor} • {report.room}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Clock size={16} />
                      {report.createdAt ? formatPHDateTime(report.createdAt) : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-medium ${getStatusConfig(report.status).color}`}>
                  {getStatusConfig(report.status).icon}
                  {report.status}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh] bg-gray-50">
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InfoCard
                  title="Category"
                  value={report.category || "N/A"}
                  icon={<FileText size={20} />}
                  subtitle="Issue type"
                />
                <InfoCard
                  title="Reported By"
                  value={report.reportedBy || "N/A"}
                  icon={<User size={20} />}
                  subtitle="Reporter"
                />
                <InfoCard
                  title="Status"
                  value={report.status || "N/A"}
                  icon={<AlertTriangle size={20} />}
                  subtitle="Current status"
                />
              </div>

              {/* Location & Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Location Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <MapPin size={20} className="text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Floor</span>
                      <span className="font-semibold text-gray-900">{report.floor || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Room</span>
                      <span className="font-semibold text-gray-900">{report.room || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Date Reported</span>
                      <span className="font-semibold text-gray-900">{formatPHDateTime(report.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Issue Details Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <AlertTriangle size={20} className="text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Issue Details</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg border border-gray-200">
                    {report.details || "No description provided"}
                  </p>
                </div>
              </div>

              {/* Action Taken (if resolved) */}
              {report.status === "Resolved" && report.actionTaken && (
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircleIcon size={20} className="text-green-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Action Taken</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed bg-green-50 p-4 rounded-lg border border-green-200">
                    {report.actionTaken}
                  </p>
                  {report.resolvedAt && (
                    <div className="mt-3 text-sm text-gray-500">
                      Resolved on: {formatPHDateTime(report.resolvedAt)}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Report ID:</span>{" "}
                <span className="font-mono text-gray-800">{report?._id?.slice(-8)}</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium text-sm"
                >
                  Close
                </button>
                
                {report.status === "Pending" && (
                  <button
                    onClick={() => handleStatusUpdate(report._id, "In Progress")}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 font-medium text-sm flex items-center gap-2"
                  >
                    <Play size={16} />
                    Start Work
                  </button>
                )}

                {report.status === "In Progress" && (
                  <button
                    onClick={() => handleStatusUpdate(report._id, "Resolved")}
                    className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-200 font-medium text-sm flex items-center gap-2"
                  >
                    <CheckCircleIcon size={16} />
                    Mark Resolved
                  </button>
                )}
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