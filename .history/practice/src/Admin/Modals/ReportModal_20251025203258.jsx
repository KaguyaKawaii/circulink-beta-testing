// ReportModal.jsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  X,
  Clock,
  Users,
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
  const [staffList, setStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState("");
  const [actionTaken, setActionTaken] = useState("");

  // Fixed API endpoints - using environment variable
  const API_URL = `${import.meta.env.VITE_API_URL}/api/reports`;
  const USERS_API = `${import.meta.env.VITE_API_URL}/api/users`;

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
          setSelectedStaff(res.data.report.assignedTo?._id || "");
        } else if (res.data._id) {
          // If response is the report object directly
          setReport(res.data);
          setSelectedStaff(res.data.assignedTo?._id || "");
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

  // 🔹 Fetch all staff list - Only staff with assigned floors
  useEffect(() => {
    const fetchStaff = async () => {
      try {
        console.log("Fetching staff list with assigned floors...");
        
        // Try multiple possible endpoints
        const baseUrl = import.meta.env.VITE_API_URL;
        const endpoints = [
          `${baseUrl}/users?role=Staff`,
          `${baseUrl}/api/users?role=Staff`, 
          `${baseUrl}/staff`,
          `${baseUrl}/api/staff`
        ];
        
        let staffData = [];
        let lastError = null;
        
        for (const endpoint of endpoints) {
          try {
            console.log(`Trying endpoint: ${endpoint}`);
            const res = await axios.get(endpoint);
            console.log("API Response:", res.data);
            
            // Handle different response structures
            if (res.data.success && Array.isArray(res.data.users)) {
              staffData = res.data.users.filter(user => user.role === "Staff");
              break;
            } else if (Array.isArray(res.data)) {
              staffData = res.data.filter(user => user.role === "Staff");
              break;
            } else if (res.data && Array.isArray(res.data.users)) {
              staffData = res.data.users.filter(user => user.role === "Staff");
              break;
            } else if (res.data && Array.isArray(res.data.data)) {
              staffData = res.data.data.filter(user => user.role === "Staff");
              break;
            } else if (res.data.success && Array.isArray(res.data.staff)) {
              staffData = res.data.staff;
              break;
            }
          } catch (err) {
            lastError = err;
            console.log(`Endpoint ${endpoint} failed:`, err.message);
            continue;
          }
        }
        
        // If all endpoints failed and no staff data, try the main users endpoint without filter
        if (staffData.length === 0) {
          try {
            console.log("Trying main users endpoint without filter...");
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`);
            if (Array.isArray(res.data)) {
              staffData = res.data.filter(user => user.role === "Staff");
            } else if (res.data.success && Array.isArray(res.data.users)) {
              staffData = res.data.users.filter(user => user.role === "Staff");
            }
          } catch (finalErr) {
            console.error("All endpoints failed:", finalErr);
          }
        }

        // Filter staff to only include those with assigned floors
        const staffWithFloors = staffData.filter(staff => 
          staff.floor && staff.floor.trim() !== "" && staff.floor !== "N/A"
        );

        console.log("Staff with assigned floors:", staffWithFloors);

        // Temporary mock data fallback for testing
        if (staffWithFloors.length === 0) {
          console.log("Using mock staff data with assigned floors for testing");
          staffData = [
            { _id: "1", name: "John Doe", role: "Staff", floor: "Ground Floor" },
            { _id: "2", name: "Jane Smith", role: "Staff", floor: "Second Floor" },
            { _id: "3", name: "Mike Johnson", role: "Staff", floor: "Third Floor" },
            { _id: "4", name: "Sarah Wilson", role: "Staff", floor: "Fourth Floor" },
            { _id: "5", name: "David Brown", role: "Staff", floor: "Fifth Floor" },
            { _id: "6", name: "Lisa Davis", role: "Staff", floor: "Second Floor" },
            { _id: "7", name: "Robert Miller", role: "Staff", floor: "Ground Floor" }
          ];
        } else {
          staffData = staffWithFloors;
        }
        
        console.log("Final staff data with floors:", staffData);
        
        // Sort staff by name for better organization
        const sortedStaff = staffData.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStaffList(sortedStaff);
        
        if (sortedStaff.length === 0) {
          console.warn("No staff members with assigned floors found");
        }
      } catch (err) {
        console.error("All staff fetching attempts failed:", err);
        setStaffList([]);
      }
    };

    fetchStaff();
  }, []);

  // 🔹 Assign staff
  const handleAssignStaff = async () => {
    if (!selectedStaff || !report) {
      alert("Please select a staff member to assign.");
      return;
    }

    try {
      setAssigning(true);
      const response = await axios.put(`${API_URL}/assign/${report._id}`, {
        staffId: selectedStaff,
      });
      
      if (response.data.success) {
        // Refresh report data
        const updatedReport = await axios.get(`${API_URL}/${report._id}`);
        if (updatedReport.data.success && updatedReport.data.report) {
          setReport(updatedReport.data.report);
        } else {
          setReport(updatedReport.data);
        }
        
        alert("Report assigned successfully!");
        onReportUpdated?.();
      } else {
        alert("Failed to assign staff: " + (response.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error assigning staff:", err);
      alert("Failed to assign staff: " + (err.response?.data?.message || err.message));
    } finally {
      setAssigning(false);
    }
  };

  // 🔹 Resolve Report
  const handleResolveReport = async () => {
    if (!report) return;

    // Validate action taken
    if (!actionTaken || actionTaken.trim() === "") {
      alert("Please describe the action taken to resolve this report.");
      return;
    }

    try {
      setActionLoading(true);
      
      // FIXED: Send required data in request body
      const response = await axios.put(`${API_URL}/resolve/${report._id}`, {
        actionTaken: actionTaken.trim(),
        resolvedBy: "admin" // You might want to get this from user context
      });
      
      if (response.data.success) {
        alert("Report resolved successfully!");
        onReportUpdated?.();
        setShowConfirmModal(false);
        setActionTaken(""); // Clear the input
        
        // Refresh report data
        const updatedReport = await axios.get(`${API_URL}/${report._id}`);
        if (updatedReport.data.success && updatedReport.data.report) {
          setReport(updatedReport.data.report);
        } else {
          setReport(updatedReport.data);
        }
      } else {
        alert("Failed to resolve report: " + (response.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error resolving report:", err);
      alert("Failed to resolve report: " + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 🔹 Archive Report
  const handleArchiveReport = async () => {
    if (!report) return;

    try {
      setActionLoading(true);
      const response = await axios.put(`${API_URL}/archive/${report._id}`, {
        archivedBy: "admin" // You might want to get this from user context
      });
      
      if (response.data.success) {
        alert("Report archived successfully!");
        onReportUpdated?.();
        onClose();
        setShowConfirmModal(false);
      } else {
        alert("Failed to archive report: " + (response.data.message || "Unknown error"));
      }
    } catch (err) {
      console.error("Error archiving report:", err);
      alert("Failed to archive report: " + (err.response?.data?.message || err.message));
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

  const showConfirmation = (action) => {
    setConfirmAction(action);
    setShowConfirmModal(true);
  };

  const handleConfirmAction = () => {
    switch (confirmAction) {
      case "resolve":
        handleResolveReport();
        break;
      case "archive":
        handleArchiveReport();
        break;
      default:
        setShowConfirmModal(false);
    }
  };

  const getConfirmModalConfig = () => {
    switch (confirmAction) {
      case "resolve":
        return {
          title: "Resolve Report",
          message: "Please describe the action taken to resolve this report:",
          icon: <CheckCircle className="text-emerald-600" size={24} />,
          confirmText: "Resolve Report",
          confirmColor: "bg-emerald-600 hover:bg-emerald-700",
          showInput: true
        };
      case "archive":
        return {
          title: "Archive Report",
          message: "Are you sure you want to archive this report? This will remove it from active reports.",
          icon: <XCircle className="text-gray-600" size={24} />,
          confirmText: "Archive Report",
          confirmColor: "bg-gray-600 hover:bg-gray-700",
          showInput: false
        };
      default:
        return {
          title: "Confirm Action",
          message: "Are you sure you want to proceed?",
          icon: <AlertCircle className="text-blue-600" size={24} />,
          confirmText: "Confirm",
          confirmColor: "bg-blue-600 hover:bg-blue-700",
          showInput: false
        };
    }
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

  // Group staff by floor for better organization - only staff with assigned floors
  const groupStaffByFloor = () => {
    const grouped = {};
    
    staffList.forEach(staff => {
      const floor = staff.floor || 'Unassigned';
      if (!grouped[floor]) {
        grouped[floor] = [];
      }
      grouped[floor].push(staff);
    });

    // Sort floors in a logical order
    const floorOrder = {
      'Ground Floor': 1,
      'Second Floor': 2,
      'Third Floor': 3,
      'Fourth Floor': 4,
      'Fifth Floor': 5,
      'Unassigned': 99
    };

    // Remove unassigned staff since we're only showing staff with floors
    delete grouped['Unassigned'];
    delete grouped[''];
    delete grouped['N/A'];

    return Object.keys(grouped)
      .sort((a, b) => (floorOrder[a] || 99) - (floorOrder[b] || 99))
      .map(floor => ({
        floor,
        staff: grouped[floor]
      }));
  };

  const renderActionButtons = () => {
    if (!report) return null;

    switch (report.status) {
      case "Pending":
      case "In Progress":
        return (
          <div className="flex gap-2">
            <button
              onClick={() => showConfirmation("archive")}
              disabled={actionLoading || assigning}
              className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
            >
              <XCircle size={16} />
              Archive
            </button>
            <button
              onClick={() => showConfirmation("resolve")}
              disabled={actionLoading || assigning}
              className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
            >
              <CheckCircle size={16} />
              Resolve Report
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
  const confirmConfig = getConfirmModalConfig();
  const groupedStaff = groupStaffByFloor();

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
                  disabled={actionLoading || assigning}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
              {["overview", "actions"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 cursor-pointer ${
                    activeTab === tab
                      ? "bg-white text-gray-900 shadow-sm cursor-pointer hover:bg-gray-50"
                      : "text-gray-600 hover:text-gray-900 cursor-pointer hover:bg-gray-50"
                  }`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
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

          {/* Main Content */}
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
              <>
                {activeTab === "overview" && (
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
                        title="Assigned To"
                        value={report.assignedTo?.name || "Unassigned"}
                        icon={<Wrench size={20} />}
                        subtitle="Staff member"
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
                        <p className="text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-lg">
                          {report.details || "No details provided"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "actions" && (
                  <div className="space-y-6">
                    {/* Assign Staff Section */}
                    {report.status !== "Resolved" && report.status !== "Archived" && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <Users size={20} className="text-red-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Assign to Staff</h3>
                        </div>
                        
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Select Staff Member (With Assigned Floors)
                            </label>
                            <select
                              value={selectedStaff}
                              onChange={(e) => setSelectedStaff(e.target.value)}
                              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              disabled={assigning}
                            >
                              <option value="">-- Select Staff Member --</option>
                              {groupedStaff.map((group) => (
                                <optgroup key={group.floor} label={`${group.floor}`}>
                                  {group.staff.map((staff) => (
                                    <option key={staff._id} value={staff._id}>
                                      {staff.name} - {staff.floor}
                                    </option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                            {staffList.length === 0 && (
                              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <p className="text-amber-700 text-sm">
                                  No staff members with assigned floors found.
                                </p>
                                <p className="text-amber-600 text-xs mt-1">
                                  Please ensure staff members have floors assigned in their profiles.
                                </p>
                              </div>
                            )}
                            {groupedStaff.length > 0 && (
                              <p className="text-xs text-gray-500 mt-2">
                                Showing {staffList.length} staff members with assigned floors
                              </p>
                            )}
                          </div>
                          
                          <button
                            onClick={handleAssignStaff}
                            disabled={assigning || !selectedStaff}
                            className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
                          >
                            <CheckCircle size={16} />
                            {assigning ? "Assigning..." : "Assign Staff"}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Show existing action taken for resolved reports */}
                    {report.status === "Resolved" && report.actionTaken && (
                      <div className="bg-white border border-gray-200 rounded-xl p-5">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-emerald-100 rounded-lg">
                            <CheckCircle size={20} className="text-emerald-600" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900">Action Taken</h3>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                          <p className="text-emerald-800 leading-relaxed">
                            {report.actionTaken}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
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

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200">
            <div className="bg-white p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                {confirmConfig.icon}
                <h3 className="text-xl font-bold text-gray-900">{confirmConfig.title}</h3>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700 mb-4">{confirmConfig.message}</p>
              
              {/* Action Taken Input for Resolve */}
              {confirmConfig.showInput && (
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
              )}
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setActionTaken("");
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 hover:bg-gray-100 rounded-lg"
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAction}
                  disabled={actionLoading || (confirmConfig.showInput && !actionTaken.trim())}
                  className={`px-6 py-2.5 text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${confirmConfig.confirmColor}`}
                >
                  {actionLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Processing...
                    </>
                  ) : (
                    confirmConfig.confirmText
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