// ReservationModal.jsx
import React, { useState } from "react";
import moment from "moment-timezone";
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
  Square,
  Plus,
  ChevronRight,
  BarChart3,
  Shield,
  IdCard,
  BookOpen,
  GraduationCap
} from "lucide-react";

const ReservationModal = ({ 
  reservation, 
  onClose, 
  onActionSuccess,
  currentUser
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingAction, setProcessingAction] = useState("");
  const [error, setError] = useState("");
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showApproveExtensionModal, setShowApproveExtensionModal] = useState(false);
  const [showEndEarlyModal, setShowEndEarlyModal] = useState(false);
  const [extensionReason, setExtensionReason] = useState("");
  const [extensionMinutes, setExtensionMinutes] = useState(30);
  const [extensionHours, setExtensionHours] = useState(0);
  const [extensionType, setExtensionType] = useState("fixed");
  const [conflictInfo, setConflictInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  if (!reservation) return null;

  const isAdmin = currentUser?.role === "Admin";
  const isStaff = currentUser?.role === "Staff";
  const isMainReserver = currentUser?._id === reservation.userId?._id;

  const formatPHDateTime = (iso) => {
    if (!iso) return "N/A";
    return moment(iso).tz("Asia/Manila").format("MMM DD, YYYY · hh:mm A");
  };

  const formatTime = (iso) => {
    if (!iso) return "N/A";
    return moment(iso).tz("Asia/Manila").format("hh:mm A");
  };

  const getStatusConfig = (status) => {
    const configs = {
      Pending: { 
        color: "bg-amber-100 text-amber-800 border-amber-200", 
        icon: <Clock size={14} />,
        displayText: "Waiting for Approval"
      },
      Approved: { 
        color: "bg-emerald-100 text-emerald-800 border-emerald-200", 
        icon: <CheckCircle size={14} />,
        displayText: "Approved"
      },
      Ongoing: { 
        color: "bg-blue-100 text-blue-800 border-blue-200", 
        icon: <Play size={14} />,
        displayText: "Ongoing"
      },
      Rejected: { 
        color: "bg-rose-100 text-rose-800 border-rose-200", 
        icon: <XCircle size={14} />,
        displayText: "Rejected"
      },
      Cancelled: { 
        color: "bg-gray-100 text-gray-800 border-gray-300", 
        icon: <XCircle size={14} />,
        displayText: "Cancelled"
      },
      Expired: { 
        color: "bg-orange-100 text-orange-800 border-orange-200", 
        icon: <Clock size={14} />,
        displayText: "Expired"
      },
      Completed: { 
        color: "bg-violet-100 text-violet-800 border-violet-200", 
        icon: <CheckCircle size={14} />,
        displayText: "Completed"
      }
    };
    return configs[status] || configs.Pending;
  };

  const handleAction = async (action, data = {}) => {
    setIsProcessing(true);
    setProcessingAction(action);
    setError("");

    try {
      let endpoint = "";
      let method = "post";
      let requestData = {};

      switch (action) {
        case "approve":
          endpoint = `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}/status`;
          method = "patch";
          requestData = { status: "Approved" };
          break;

        case "reject":
          endpoint = `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}/status`;
          method = "patch";
          requestData = { status: "Rejected" };
          break;

        case "start":
          endpoint = `${import.meta.env.VITE_API_URL}/api/reservations/start/${reservation._id}`;
          method = "post";
          break;

        case "end-early":
          endpoint = `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}/end-early`;
          method = "post";
          break;

        case "cancel":
          endpoint = `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}`;
          method = "delete";
          break;

        case "request-extension":
          endpoint = `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}/request-extension`;
          method = "put";
          requestData = { 
            extensionReason: data.extensionReason || ""
          };
          break;

        case "approve-extension":
          endpoint = `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}/handle-extension`;
          method = "put";
          requestData = { 
            action: "approve",
            extensionType: data.extensionType,
            extensionMinutes: data.extensionMinutes,
            extensionHours: data.extensionHours
          };
          break;

        case "reject-extension":
          endpoint = `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}/handle-extension`;
          method = "put";
          requestData = { action: "reject" };
          break;

        default:
          throw new Error("Unknown action");
      }

      const response = await axios({
        method,
        url: endpoint,
        data: Object.keys(requestData).length > 0 ? requestData : undefined
      });

      if (action === "request-extension" && response.data.conflictTime) {
        setConflictInfo({
          time: new Date(response.data.conflictTime),
          hasConflict: true
        });
      }

      if (response.data) {
        onActionSuccess?.();
        onClose();
      }
    } catch (err) {
      console.error(`Error performing ${action}:`, err);
      setError(err.response?.data?.message || `Failed to ${action} reservation`);
    } finally {
      setIsProcessing(false);
      setProcessingAction("");
    }
  };

  const handleApprove = () => handleAction("approve");
  const handleReject = () => handleAction("reject");
  const handleStart = () => handleAction("start");
  
  const handleEndEarly = () => {
    setShowEndEarlyModal(true);
  };
  
  const confirmEndEarly = () => {
    handleAction("end-early");
    setShowEndEarlyModal(false);
  };
  
  const handleCancel = () => handleAction("cancel");
  const handleRejectExtension = () => handleAction("reject-extension");

  const handleApproveExtension = async () => {
    const totalMinutes = (parseInt(extensionHours) * 60) + parseInt(extensionMinutes);
    
    const requestData = {
      extensionType: extensionType,
      extensionMinutes: totalMinutes,
      extensionHours: parseInt(extensionHours)
    };

    await handleAction("approve-extension", requestData);
    setShowApproveExtensionModal(false);
    setExtensionReason("");
    setExtensionMinutes(30);
    setExtensionHours(0);
    setExtensionType("fixed");
  };

  const handleRequestExtension = async () => {
    await handleAction("request-extension", {
      extensionReason: extensionReason
    });
    setShowExtensionModal(false);
    setExtensionReason("");
  };

  const getExtendedEndTime = () => {
    if (!reservation.extendedEndDatetime) return null;
    return new Date(reservation.extendedEndDatetime);
  };

  const extendedEndTime = getExtendedEndTime();
  const originalEndTime = new Date(reservation.endDatetime);
  const currentEndTime = extendedEndTime || originalEndTime;

  // Get all participants
  const allParticipants = reservation.participants || [];
  const totalParticipants = allParticipants.length;

  const statusConfig = getStatusConfig(reservation.status);

  const now = new Date();
  const minExtensionTime = new Date(currentEndTime);
  const maxExtensionTime = reservation.maxExtendedEndDatetime 
    ? new Date(reservation.maxExtendedEndDatetime)
    : new Date(currentEndTime.getTime() + 4 * 60 * 60 * 1000);

  const formatDateTimeForInput = (date) => {
    return moment(date).tz("Asia/Manila").format("YYYY-MM-DDTHH:mm");
  };

  const renderActionButtons = () => {
    // If user is not admin/staff and not main reserver, only show close button
    if (!isAdmin && !isStaff && !isMainReserver) {
      return (
        <button
          onClick={onClose}
          className="px-6 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
        >
          Close Details
        </button>
      );
    }

    switch (reservation.status) {
      case "Pending":
        // Only admin can approve/reject pending reservations
        if (isAdmin) {
          return (
            <div className="flex gap-2">
              <button
                onClick={handleReject}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
              >
                <XCircle size={16} />
                {isProcessing && processingAction === 'reject' ? "Processing..." : "Decline"}
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
              >
                <CheckCircle size={16} />
                {isProcessing && processingAction === 'approve' ? "Processing..." : "Approve"}
              </button>
            </div>
          );
        }
        // Staff can only view pending reservations
        if (isStaff) {
          return (
            <div className="flex gap-2">
              <div className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg text-sm">
                Monitoring Mode - Pending Reservation
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
              >
                Close
              </button>
            </div>
          );
        }
        // Main reserver can cancel pending reservations
        if (isMainReserver) {
          return (
            <button
              onClick={handleCancel}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
            >
              <XCircle size={16} />
              {isProcessing && processingAction === 'cancel' ? "Cancelling..." : "Cancel"}
            </button>
          );
        }
        break;

      case "Approved":
        const actions = [];
        
        // Both admin and staff can start approved reservations
        if (isAdmin || isStaff) {
          actions.push(
            <button
              key="start"
              onClick={handleStart}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
            >
              <Play size={16} />
              {isProcessing && processingAction === 'start' ? "Starting..." : "Start Session"}
            </button>
          );
        }
        
        // Main reserver can cancel approved reservations
        if (isMainReserver) {
          actions.push(
            <button
              key="cancel"
              onClick={handleCancel}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
            >
              <XCircle size={16} />
              {isProcessing && processingAction === 'cancel' ? "Cancelling..." : "Cancel"}
            </button>
          );
        }

        return actions.length > 0 ? actions : (
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
          >
            Close
          </button>
        );

      case "Ongoing":
        const ongoingActions = [];
        
        // Both admin and staff can end ongoing reservations early
        if (isAdmin || isStaff) {
          ongoingActions.push(
            <button
              key="end-early"
              onClick={handleEndEarly}
              disabled={isProcessing}
              className="px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-sm flex items-center gap-2"
            >
              <Square size={16} />
              {isProcessing && processingAction === 'end-early' ? "Ending..." : "End Early"}
            </button>
          );
        }

        // Both admin AND staff can handle extension requests with time selection
        if (reservation.extensionRequested && reservation.extensionStatus === "Pending" && (isAdmin || isStaff)) {
          ongoingActions.push(
            <div key="extension-actions" className="flex gap-2">
              <button
                onClick={handleRejectExtension}
                disabled={isProcessing}
                className="px-3 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs flex items-center gap-1"
              >
                <XCircle size={14} />
                Reject
              </button>
              <button
                onClick={() => setShowApproveExtensionModal(true)}
                disabled={isProcessing}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 font-medium text-xs flex items-center gap-1"
              >
                <CheckCircle size={14} />
                Approve
              </button>
            </div>
          );
        } 
        // Main reserver can request extension if not already requested
        else if (isMainReserver && !reservation.extensionRequested) {
          ongoingActions.push(
            <button
              key="request-extension"
              onClick={() => setShowExtensionModal(true)}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all duration-200 font-medium text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              Extend Time
            </button>
          );
        }

        return ongoingActions.length > 0 ? ongoingActions : (
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
          >
            Close
          </button>
        );

      default:
        return (
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 font-medium text-sm"
          >
            Close
          </button>
        );
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

  const ParticipantCard = ({ participant }) => (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-150">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm bg-gradient-to-br from-yellow-400 to-yellow-500">
          {participant.name?.charAt(0) || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-semibold text-gray-900 truncate">{participant.name}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-gray-600">
            <div className="flex items-center gap-1">
              <IdCard size={12} />
              <span className="font-mono truncate">{participant.id_number}</span>
            </div>
            <div className="flex items-center gap-1">
              <Building size={12} />
              <span className="truncate">{participant.department}</span>
            </div>
            {(participant.course && participant.course !== "N/A") && (
              <div className="flex items-center gap-1">
                <BookOpen size={12} />
                <span className="truncate">{participant.course}</span>
              </div>
            )}
            {(participant.year_level && participant.year_level !== "N/A") && (
              <div className="flex items-center gap-1">
                <GraduationCap size={12} />
                <span className="truncate">{participant.year_level}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center border border-gray-300">
                <Building size={24} className="text-gray-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{reservation.roomName}</h1>
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="flex items-center gap-1.5 text-sm">
                    <MapPin size={16} />
                    {reservation.location}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar size={16} />
                    {formatPHDateTime(reservation.createdAt)}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.icon}
                {statusConfig.displayText}
              </div>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200 disabled:opacity-50"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {["overview", "participants", "details"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 ${
                  activeTab === tab
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
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
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <InfoCard
                  title="Total Participants"
                  value={totalParticipants}
                  icon={<Users size={20} />}
                  subtitle="Additional members only"
                />
                <InfoCard
                  title="Start Time"
                  value={formatTime(reservation.datetime)}
                  icon={<Clock size={20} />}
                  subtitle={moment(reservation.datetime).tz("Asia/Manila").format("MMM DD")}
                />
                <InfoCard
                  title="End Time"
                  value={formatTime(currentEndTime)}
                  icon={<Clock size={20} />}
                  subtitle={extendedEndTime ? "Extended" : "Original"}
                />
                <InfoCard
                  title="Duration"
                  value={`${Math.round((currentEndTime - new Date(reservation.datetime)) / (1000 * 60 * 60))} hours`}
                  icon={<BarChart3 size={20} />}
                  subtitle="Total time"
                />
              </div>

              {/* Purpose & User Info */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Purpose Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <FileText size={20} className="text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Reservation Purpose</h3>
                  </div>
                  <p className="text-gray-700 leading-relaxed">{reservation.purpose}</p>
                </div>

                {/* Timeline Card */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Clock size={20} className="text-gray-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Reservation Timeline</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Scheduled Start</span>
                      <span className="font-semibold text-gray-900">{formatPHDateTime(reservation.datetime)}</span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-gray-600">Original End</span>
                      <span className="font-semibold text-gray-900">{formatPHDateTime(originalEndTime)}</span>
                    </div>
                    {extendedEndTime && (
                      <div className="flex items-center justify-between py-2 bg-emerald-50 rounded-lg px-4 border border-emerald-200">
                        <span className="text-emerald-700 font-semibold">Extended End</span>
                        <span className="text-emerald-700 font-semibold">{formatPHDateTime(extendedEndTime)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "participants" && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Users size={20} className="text-gray-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Additional Participants</h3>
                      <p className="text-sm text-gray-600">{totalParticipants} additional member(s)</p>
                    </div>
                  </div>
                  <div className="px-3 py-1.5 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                    {totalParticipants} people
                  </div>
                </div>

                <div className="space-y-3">
                  {allParticipants.map((participant, index) => (
                    <ParticipantCard
                      key={index}
                      participant={participant}
                    />
                  ))}
                  
                  {allParticipants.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Users size={48} className="mx-auto mb-3 text-gray-300" />
                      <p>No additional participants</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "details" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* System Information */}
                <div className="bg-white border border-gray-200 rounded-xl p-5">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Reservation ID</span>
                      <span className="font-mono text-sm text-gray-900">{reservation._id?.slice(-8)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Created</span>
                      <span className="text-gray-900">{formatPHDateTime(reservation.createdAt)}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-gray-600">Last Updated</span>
                      <span className="text-gray-900">{formatPHDateTime(reservation.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Extension Information */}
                {reservation.extensionRequested && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                    <h3 className="text-lg font-semibold text-amber-900 mb-4">Extension Request</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700">Status</span>
                        <span className="font-semibold text-amber-900">{reservation.extensionStatus || "Pending"}</span>
                      </div>
                      {reservation.extendedEndDatetime && (
                        <div className="flex justify-between items-center">
                          <span className="text-amber-700">Extended Until</span>
                          <span className="font-semibold text-amber-900">{formatPHDateTime(reservation.extendedEndDatetime)}</span>
                        </div>
                      )}
                      {reservation.extensionReason && (
                        <div className="flex flex-col gap-1 py-2">
                          <span className="text-amber-700">Reason</span>
                          <span className="text-amber-900 bg-amber-100/50 p-2 rounded-lg text-sm break-words whitespace-normal">
                            {reservation.extensionReason}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Logged in as</span>{" "}
              <span className="font-semibold text-gray-800 capitalize">{currentUser?.role}</span>
              {isMainReserver && (
                <span className="ml-2 px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs font-medium">
                  Main Reserver
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 justify-center sm:justify-end">
              {renderActionButtons()}
            </div>
          </div>
        </div>
      </div>

      {/* End Early Confirmation Modal */}
      {showEndEarlyModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden">
            <div className="bg-white p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Square size={24} className="text-orange-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">End Session Early</h3>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={20} className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800 mb-2">
                      Are you sure you want to end this session early?
                    </p>
                    <p className="text-sm text-orange-700">
                      This action will immediately terminate the current reservation. 
                      The room will become available for other users. This cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Session Details */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-3">SESSION DETAILS</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Room</span>
                    <span className="text-sm font-semibold text-gray-900">{reservation.roomName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Started</span>
                    <span className="text-sm font-semibold text-gray-900">{formatTime(reservation.actualStartDatetime || reservation.datetime)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Scheduled End</span>
                    <span className="text-sm font-semibold text-gray-900">{formatTime(currentEndTime)}</span>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-700 flex items-center gap-1">
                  <XCircle size={14} />
                  This action cannot be reversed. The session will be marked as completed early.
                </p>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowEndEarlyModal(false)}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 hover:bg-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={confirmEndEarly}
                disabled={isProcessing}
                className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-200 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Ending...
                  </>
                ) : (
                  <>
                    <Square size={16} />
                    Yes, End Session
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Request Modal (for user requesting extension) */}
      {showExtensionModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden">
            <div className="bg-white p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Plus size={24} className="text-gray-600" />
                <h3 className="text-xl font-bold text-gray-900">Request Time Extension</h3>
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Current Schedule - For information only */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Current End Time</p>
                <p className="text-sm font-semibold text-gray-900">{formatTime(currentEndTime)}</p>
              </div>

              {/* Reason/Notes - ONLY FIELD */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Extension <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Please explain why you need additional time for your reservation. The staff will determine the extension duration."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none transition-colors duration-200"
                  rows={4}
                  required
                />
              </div>
              
              {/* Info Banner */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Your extension request will be reviewed by staff. They will determine the appropriate extension duration based on availability and your reason.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowExtensionModal(false);
                  setExtensionReason("");
                }}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 hover:bg-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestExtension}
                disabled={!extensionReason.trim() || isProcessing}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-200 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Request Extension
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Approval Modal (for staff/admin approving extension) */}
      {showApproveExtensionModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md border border-gray-200 overflow-hidden">
            <div className="bg-white p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-emerald-600" />
                <h3 className="text-xl font-bold text-gray-900">Approve Extension Request</h3>
              </div>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Current Schedule */}
              <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-1">Current End Time</p>
                <p className="text-sm font-semibold text-gray-900">{formatTime(currentEndTime)}</p>
              </div>

              {/* User's Reason */}
              {reservation.extensionReason && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">User's Reason:</p>
                  <p className="text-sm text-amber-800">{reservation.extensionReason}</p>
                </div>
              )}

              {/* Extension Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extension Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setExtensionType("fixed")}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                      extensionType === "fixed"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setExtensionType("continuous")}
                    className={`px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200 ${
                      extensionType === "continuous"
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    Continuous
                  </button>
                </div>
              </div>

              {/* Fixed Extension Controls */}
              {extensionType === "fixed" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Hours
                    </label>
                    <select
                      value={extensionHours}
                      onChange={(e) => setExtensionHours(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[0, 1, 2, 3, 4].map(hours => (
                        <option key={hours} value={hours}>{hours} hour{hours !== 1 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minutes
                    </label>
                    <select
                      value={extensionMinutes}
                      onChange={(e) => setExtensionMinutes(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {[0, 15, 30, 45].map(minutes => (
                        <option key={minutes} value={minutes}>{minutes} minutes</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                    <p className="text-sm text-indigo-700">
                      Total extension: <span className="font-bold">{extensionHours} hour{extensionHours !== 1 ? 's' : ''} {extensionMinutes > 0 ? `${extensionMinutes} minutes` : ''}</span>
                    </p>
                    <p className="text-xs text-indigo-600 mt-1">
                      New end time: {formatTime(new Date(currentEndTime.getTime() + (extensionHours * 60 + extensionMinutes) * 60000))}
                    </p>
                  </div>
                </div>
              )}

              {/* Continuous Extension Info */}
              {extensionType === "continuous" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 mb-1">Continuous Extension</p>
                      <p className="text-xs text-blue-700">
                        The reservation will continue automatically until manually ended, until the next scheduled reservation, or until the maximum extension limit is reached.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conflict Warning Banner */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    The system will check for conflicts when you approve. If there's a scheduling conflict, the extension will be limited to the next available slot.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowApproveExtensionModal(false);
                  setExtensionReason("");
                  setExtensionMinutes(30);
                  setExtensionHours(0);
                  setExtensionType("fixed");
                }}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 font-medium transition-colors duration-200 hover:bg-white rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleApproveExtension}
                disabled={
                  isProcessing || 
                  (extensionType === "fixed" && extensionHours === 0 && extensionMinutes === 0)
                }
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors duration-200 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Approving...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Approve Extension
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReservationModal;