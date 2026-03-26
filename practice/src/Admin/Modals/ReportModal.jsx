// ReportModal.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  Clock,
  MapPin,
  Calendar,
  FileText,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  XCircle,
  Play,
  Wrench,
  AlertTriangle
} from "lucide-react";

const ReportModal = ({ reportId, onClose, onReportUpdated }) => {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [resolveError, setResolveError] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionTaken, setActionTaken] = useState("");

  // Fixed API endpoints - using environment variable
  const API_URL = `${import.meta.env.VITE_API_URL}/api/reports`;

  // Helper function to extract valid report ID
  const extractReportId = (reportId) => {
    if (!reportId) return null;
    
    if (typeof reportId === 'string' && reportId.length === 24) {
      return reportId;
    }
    
    if (typeof reportId === 'object' && reportId._id) {
      return reportId._id;
    }
    
    return null;
  };

  // 🔹 Fetch single report
  useEffect(() => {
    const fetchReport = async () => {
      const validReportId = extractReportId(reportId);
      
      if (!validReportId) {
        setError("Invalid report ID format");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        console.log("Fetching report with ID:", validReportId);
        const res = await axios.get(`${API_URL}/${validReportId}`);
        
        // Handle different response structures
        if (res.data.success && res.data.report) {
          setReport(res.data.report);
        } else if (res.data._id) {
          // If response is the report object directly
          setReport(res.data);
        } else {
          setError("Invalid report data structure");
        }
      } catch (err) {
        console.error("Failed to fetch report", err);
        if (err.response?.status === 404) {
          setError("Report not found");
        } else {
          setError("Failed to load report details");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchReport();
  }, [reportId]);

  // 🔹 Resolve Report
  const handleResolveReport = async () => {
    if (!report) return;

    // Validate action taken
    if (!actionTaken || actionTaken.trim() === "") {
      setResolveError("Please describe the action taken to resolve this report.");
      return;
    }

    try {
      setActionLoading(true);
      setResolveError("");
      
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const resolvedBy = currentUser._id || "admin";
      
      const response = await axios.put(`${API_URL}/${report._id}/resolve`, {
        actionTaken: actionTaken.trim(),
        resolvedBy: resolvedBy
      });
      
      if (response.data.success || response.data.message) {
        // Success - close modal and refresh
        onReportUpdated?.();
        setShowConfirmModal(false);
        setActionTaken(""); // Clear the input
        onClose(); // Close the main modal
      } else {
        setResolveError(response.data.message || "Failed to resolve report");
      }
    } catch (err) {
      console.error("Error resolving report:", err);
      setResolveError(err.response?.data?.message || err.message || "Failed to resolve report");
    } finally {
      setActionLoading(false);
    }
  };

  const formatPHDateTime = (iso) => {
    if (!iso) return "N/A";
    return new Date(iso).toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { 
        color: "bg-amber-100 text-amber-800 border-amber-200", 
        icon: <Clock size={14} />,
      },
      "In Progress": { 
        color: "bg-blue-100 text-blue-800 border-blue-200", 
        icon: <Play size={14} />,
      },
      Resolved: { 
        color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
        icon: <CheckCircle size={14} />,
      },
      Archived: { 
        color: "bg-gray-100 text-gray-800 border-gray-300", 
        icon: <XCircle size={14} />,
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

  const renderActionButtons = () => {
    if (!report) return null;

    switch (report.status) {
      case "Pending":
      case "In Progress":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => setShowConfirmModal(true)}
              disabled={actionLoading}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2 cursor-pointer"
            >
              <CheckCircle size={16} />
              Resolve Report
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm cursor-pointer"
            >
              Close
            </button>
          </div>
        );

      default:
        return (
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm cursor-pointer"
          >
            Close
          </button>
        );
    }
  };

  if (!reportId) return null;

  const statusConfig = getStatusConfig(report?.status);

  return (
    <>
      <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden border border-gray-200">
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
                      {report?.floor} • {report?.room}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Calendar size={16} />
                      {report?.createdAt ? formatPHDateTime(report.createdAt) : "N/A"}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-medium ${statusConfig?.color}`}>
                  {statusConfig?.icon}
                  {report?.status}
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mx-6 mt-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Main Content - Always showing full details */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <p className="text-gray-500">Loading report details...</p>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-500">{error}</p>
                <button 
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 cursor-pointer"
                >
                  Close
                </button>
              </div>
            ) : report ? (
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {/* Complete Report Information */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Complete Report Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Basic Information</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Report ID</span>
                          <span className="font-mono text-sm text-gray-900">{report._id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Category</span>
                          <span className="font-medium text-gray-900">{report.category}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Status</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusConfig(report.status).color}`}>
                            {report.status}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Reported By</span>
                          <span className="font-medium text-gray-900">{report.reportedBy}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-3">Location & Assignment</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Floor</span>
                          <span className="font-medium text-gray-900">{report.floor}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-gray-100">
                          <span className="text-gray-600">Room</span>
                          <span className="font-medium text-gray-900">{report.room}</span>
                        </div>
                        {report.assignedBy && (
                          <div className="flex justify-between py-2 border-b border-gray-100">
                            <span className="text-gray-600">Assigned By</span>
                            <span className="font-medium text-gray-900">{report.assignedBy.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Issue Details - Full Description with max-width and wrapping */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Issue Details</h4>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words max-w-full">
                      {report.details}
                    </p>
                  </div>
                </div>

                {/* Action Taken (if resolved) - with max-width and wrapping */}
                {report.actionTaken && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="text-sm font-medium text-gray-500 mb-3">Action Taken</h4>
                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                      <p className="text-emerald-800 leading-relaxed whitespace-pre-wrap break-words max-w-full">
                        {report.actionTaken}
                      </p>
                      {report.resolvedAt && (
                        <p className="text-sm text-emerald-600 mt-2">
                          Resolved on: {formatPHDateTime(report.resolvedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Timeline</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Created</span>
                      <span className="font-medium text-gray-900">{formatPHDateTime(report.createdAt)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="font-medium text-gray-900">{formatPHDateTime(report.updatedAt)}</span>
                    </div>
                    {report.resolvedAt && (
                      <div className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">Resolved</span>
                        <span className="font-medium text-gray-900">{formatPHDateTime(report.resolvedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">Report not found.</p>
                <button 
                  onClick={onClose}
                  className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 cursor-pointer"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 bg-gray-50 p-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">Report ID:</span>{" "}
                <span className="font-mono text-gray-800">{report?._id?.slice(-8)}</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
                {renderActionButtons()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Resolve Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
            <div className="bg-white p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <CheckCircle className="text-emerald-600" size={24} />
                <h3 className="text-xl font-bold text-gray-900">Resolve Report</h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                Please describe the action taken to resolve this report:
              </p>
              
              {resolveError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-700">{resolveError}</p>
                </div>
              )}
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Action Taken *
                </label>
                <textarea
                  value={actionTaken}
                  onChange={(e) => setActionTaken(e.target.value)}
                  placeholder="Describe what was done to resolve this issue..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                  rows="3"
                  disabled={actionLoading}
                />
                <p className="text-xs text-gray-500 mt-1">
                  This description will be recorded and visible to the reporter.
                </p>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setActionTaken("");
                    setResolveError("");
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 hover:bg-gray-100 rounded-lg"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleResolveReport}
                  disabled={actionLoading || !actionTaken.trim()}
                  className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    "Resolve Report"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReportModal;