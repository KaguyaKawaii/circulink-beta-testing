import React, { useState } from "react";
import axios from "axios";
import { io } from "socket.io-client";
import { 
  X, User, Mail, IdCard, Shield, Building, GraduationCap, 
  Layers, Calendar, Clock, Users
} from "lucide-react";

export default function UserViewModal({ user, onClose, onToggleVerified, onUserUpdated }) {
  const [imgTimestamp, setImgTimestamp] = useState(Date.now());
  const [loading, setLoading] = useState(false);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const getProfilePictureUrl = () => {
    if (!user.profilePicture) return null;
    if (user.profilePicture.startsWith("http")) {
      return `${user.profilePicture}?t=${imgTimestamp}`;
    } else {
      return `${import.meta.env.VITE_API_URL}${user.profilePicture}?t=${imgTimestamp}`;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleString("en-PH", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  // ✅ FIXED: Use the onToggleVerified prop directly
  const handleToggleVerification = async () => {
    try {
      setVerificationLoading(true);
      console.log("Toggling verification for:", user._id, "Current verified:", user.verified);
      
      // Call the parent function to handle verification
      if (onToggleVerified) {
        await onToggleVerified(user);
      }
    } catch (error) {
      console.error("Failed to toggle verification:", error);
      alert("Failed to update verification status.");
    } finally {
      setVerificationLoading(false);
      setImgTimestamp(Date.now());
    }
  };

  // ✅ FIXED: handle suspend/unsuspend with correct endpoint + better error messages
  const handleToggleSuspension = async () => {
    try {
      setLoading(true);
      console.log("Toggling suspension for:", user._id, "=>", !user.suspended);
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/toggle-suspend/${user._id}`,
        { suspend: !user.suspended }
      );
      
      if (response.data.success) {
        // Emit socket event for real-time updates
        const socket = window.socket || io(import.meta.env.VITE_API_URL);
        socket.emit("user-updated", response.data.user);
        
        if (onUserUpdated) {
          onUserUpdated(response.data.user); // refresh parent state
        }
      } else {
        throw new Error(response.data.message || "Failed to update suspension status");
      }
    } catch (error) {
      console.error("Failed to toggle suspension:", error.response?.data || error.message);
      alert(error.response?.data?.message || "Failed to update suspension status.");
    } finally {
      setLoading(false);
      setImgTimestamp(Date.now()); // force reload image if status changes overlay
    }
  };

  // Helper function to render additional participants
  const renderAdditionalParticipants = () => {
    if (!user.additionalParticipants || user.additionalParticipants.length === 0) {
      return (
        <div className="col-span-2 bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-gray-500 text-sm">No additional participants</p>
        </div>
      );
    }

    return (
      <div className="col-span-2 bg-gray-50 rounded-lg p-4">
        <div className="space-y-3">
          {user.additionalParticipants.map((participant, index) => (
            <div 
              key={index} 
              className="grid grid-cols-3 gap-4 pb-3 border-b border-gray-200 last:border-0 last:pb-0"
            >
              <DetailItem 
                icon={<User size={16} />} 
                label="Name" 
                value={participant.name || "—"} 
                className="col-span-1"
              />
              <DetailItem 
                icon={<IdCard size={16} />} 
                label="ID Number" 
                value={participant.id_number || "—"} 
                className="col-span-1"
              />
              <DetailItem 
                icon={<Mail size={16} />} 
                label="Email" 
                value={participant.email || "—"} 
                className="col-span-1"
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-lg overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <header className="flex justify-between items-center bg-gray-50 border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
          <h2 className="text-xl font-semibold text-gray-800">User Profile</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </header>

        {/* Modal Content */}
        <div className="p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Profile Picture + Actions */}
            <div className="flex flex-col items-center w-full lg:w-1/3">
              <div className="relative w-40 h-40 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden mb-4">
                {user.profilePicture ? (
                  <img
                    src={getProfilePictureUrl()}
                    alt={`${user.name}'s profile`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "/default-avatar.png";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={64} className="text-gray-400" />
                  </div>
                )}
              </div>

              {/* Status Badges */}
              <div className="flex flex-col gap-2 mb-4 items-center">
                <span className={`px-3 py-0.5 rounded-full text-xs font-medium ${
                  user.verified 
                    ? "bg-green-50 text-green-700 border border-green-100" 
                    : "bg-gray-50 text-gray-600 border border-gray-200"
                }`}>
                  {user.verified ? "Verified" : "Unverified"}
                </span>

                {user.suspended && (
                  <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                    Suspended
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 w-full max-w-xs">
                <button
                  onClick={handleToggleVerification}
                  disabled={verificationLoading}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border cursor-pointer ${
                    user.verified
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200"
                      : "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-100"
                  } ${verificationLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {verificationLoading
                    ? "Processing..."
                    : user.verified
                      ? "Revoke Verification"
                      : "Verify Account"}
                </button>

                <button
                  onClick={handleToggleSuspension}
                  disabled={loading}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors border cursor-pointer ${
                    user.suspended
                      ? "bg-green-50 text-green-600 hover:bg-green-100 border-green-100"
                      : "bg-red-50 text-red-600 hover:bg-red-100 border-red-100"
                  } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {loading
                    ? "Processing..."
                    : user.suspended
                      ? "Unsuspend Account"
                      : "Suspend Account"}
                </button>
              </div>
            </div>

            {/* User Details */}
            <div className="w-full lg:w-2/3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-gray-700 flex items-center gap-2">
                    <User size={18} className="text-gray-500" /> Basic Info
                  </h3>
                  <DetailItem icon={<User size={16} />} label="Full Name" value={user.name || "—"} />
                  <DetailItem icon={<Mail size={16} />} label="Email" value={user.email || "—"} />
                  <DetailItem icon={<IdCard size={16} />} label="ID Number" value={user.id_number || "—"} />
                  <DetailItem 
                    icon={<Shield size={16} />} 
                    label="Role" 
                    value={user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "—"} 
                  />
                </div>

                {/* Role-Specific Info */}
                <div className="space-y-4">
                  <h3 className="text-base font-medium text-gray-700 flex items-center gap-2">
                    <Building size={18} className="text-gray-500" /> Institution
                  </h3>
                  {(user.role === "Student" || user.role === "Faculty") && (
                    <DetailItem icon={<Building size={16} />} label="Department" value={user.department || "—"} />
                  )}
                  {user.role === "Staff" && (
                    <DetailItem icon={<Layers size={16} />} label="Assigned Floor" value={user.floor || "—"} />
                  )}
                  {user.role === "Student" && (
                    <>
                      <DetailItem icon={<GraduationCap size={16} />} label="Course" value={user.course || "—"} />
                      <DetailItem icon={<GraduationCap size={16} />} label="Year Level" value={user.year_level || user.yearLevel || "—"} />
                    </>
                  )}
                </div>

                {/* System Info */}
                <div className="md:col-span-2 space-y-4 pt-2">
                  <h3 className="text-base font-medium text-gray-700 flex items-center gap-2">
                    <Clock size={18} className="text-gray-500" /> System Info
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <DetailItem icon={<Calendar size={16} />} label="Account Created" value={formatDate(user.createdAt || user.created_at)} />
                    <DetailItem icon={<Clock size={16} />} label="Last Updated" value={formatDate(user.updatedAt || user.updated_at)} />
                  </div>
                </div>

                {/* Additional Participants Section */}
                {user.additionalParticipants && user.additionalParticipants.length > 0 && (
                  <div className="md:col-span-2 space-y-4 pt-2">
                    <h3 className="text-base font-medium text-gray-700 flex items-center gap-2">
                      <Users size={18} className="text-gray-500" /> Additional Participants ({user.additionalParticipants.length})
                    </h3>
                    {renderAdditionalParticipants()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end sticky bottom-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Reusable detail component
function DetailItem({ icon, label, value, className = "" }) {
  return (
    <div className={`flex items-start gap-3 ${className}`}>
      <div className="p-1.5 bg-gray-100 rounded-full text-gray-600 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-normal text-gray-500">{label}</p>
        <p className="text-gray-700 font-medium text-sm truncate" title={value}>{value || "—"}</p>
      </div>
    </div>
  );
}