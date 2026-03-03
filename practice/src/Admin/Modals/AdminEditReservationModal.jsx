// components/Modals/AdminEditReservationModal.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import moment from "moment-timezone";
import {
  X,
  Calendar,
  Clock,
  Users,
  MapPin,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  User,
  Building,
  BookOpen,
  GraduationCap,
  IdCard,
  Edit,
  Plus,
  Trash2,
  Search,
  Shield
} from "lucide-react";

const AdminEditReservationModal = ({ reservation, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    endTime: "",
    purpose: "",
    participants: [],
    status: ""
  });

  const [validation, setValidation] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showEndTimeModal, setShowEndTimeModal] = useState(false);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [floorValidation, setFloorValidation] = useState(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const timeSlots = [
    { value: "07:00", display: "7:00 AM" },
    { value: "07:30", display: "7:30 AM" },
    { value: "08:00", display: "8:00 AM" },
    { value: "08:30", display: "8:30 AM" },
    { value: "09:00", display: "9:00 AM" },
    { value: "09:30", display: "9:30 AM" },
    { value: "10:00", display: "10:00 AM" },
    { value: "10:30", display: "10:30 AM" },
    { value: "11:00", display: "11:00 AM" },
    { value: "11:30", display: "11:30 AM" },
    { value: "13:00", display: "1:00 PM" },
    { value: "13:30", display: "1:30 PM" },
    { value: "14:00", display: "2:00 PM" },
    { value: "14:30", display: "2:30 PM" },
    { value: "15:00", display: "3:00 PM" },
    { value: "15:30", display: "3:30 PM" },
    { value: "16:00", display: "4:00 PM" },
    { value: "16:30", display: "4:30 PM" },
    { value: "17:00", display: "5:00 PM" }
  ];

  useEffect(() => {
    if (reservation) {
      const startDate = new Date(reservation.datetime);
      const endDate = new Date(reservation.endDatetime);
      
      // Format date as YYYY-MM-DD
      const formattedDate = startDate.toISOString().split('T')[0];
      
      // Format times as HH:MM (24-hour)
      const formattedStartTime = startDate.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC' // Use UTC to avoid timezone issues
      });
      
      const formattedEndTime = endDate.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
      });

      setFormData({
        date: formattedDate,
        time: formattedStartTime,
        endTime: formattedEndTime,
        purpose: reservation.purpose || "",
        participants: reservation.participants || [],
        status: reservation.status || ""
      });

      // Initialize validation for participants
      const v = (reservation.participants || []).map(() => ({
        status: "valid",
        message: "Verified ✓",
        loading: false
      }));
      setValidation(v);
    }
  }, [reservation]);

  // Calendar functions
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, currentYear]);

  const generateCalendarDays = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth, currentYear);
    const firstDay = firstDayOfMonth(currentMonth, currentYear);
    const now = new Date();
    const today = now.getDate();
    const currentMonthNow = now.getMonth();
    const currentYearNow = now.getFullYear();

    for (let i = 0; i < firstDay; i++) days.push(null);

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dateObj = new Date(currentYear, currentMonth, i);
      const isSunday = dateObj.getDay() === 0;
      const isPastDate = currentYear < currentYearNow || 
                       (currentYear === currentYearNow && currentMonth < currentMonthNow) || 
                       (currentYear === currentYearNow && currentMonth === currentMonthNow && i < today);
      
      days.push({ 
        day: i, 
        date: dateStr, 
        disabled: isPastDate || isSunday,
        isSunday: isSunday
      });
    }

    setCalendarDays(days);
  };

  const handleMonthChange = (increment) => {
    let newMonth = currentMonth + increment;
    let newYear = currentYear;
    
    if (newMonth < 0) {
      newMonth = 11;
      newYear--;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear++;
    }
    
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
  };

  // Validate floor access for participants (admin can bypass)
  const validateFloorAccess = async () => {
    if (!reservation?.location || formData.participants.length === 0) return;

    const participantIds = formData.participants
      .filter(p => p.id_number && p.id_number.trim())
      .map(p => p.id_number);

    if (participantIds.length === 0) return;

    setFloorValidation({ loading: true });

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/validate-floor-access`,
        {
          location: reservation.location,
          participantIds
        }
      );

      // For admin, we just show warnings but don't block
      setFloorValidation({
        valid: res.data.valid,
        invalidParticipants: res.data.invalidParticipants || [],
        message: res.data.restrictionMessage,
        isAdmin: true // Indicate this is for admin view
      });

    } catch (err) {
      console.error("Floor validation error:", err);
      setFloorValidation({ valid: false, error: "Failed to validate floor access" });
    } finally {
      setFloorValidation(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    if (reservation?.location && formData.participants.some(p => p.id_number)) {
      validateFloorAccess();
    }
  }, [reservation?.location, JSON.stringify(formData.participants.map(p => p.id_number))]);

  const handleParticipantChange = async (idx, field, val) => {
    const updated = [...formData.participants];
    
    if (field === "id_number") {
      val = val.replace(/\D/g, '');
    }

    updated[idx][field] = val;

    if (field === "id_number" && val.trim()) {
      const isDuplicate = formData.participants.some(
        (p, i) => i !== idx && p.id_number === val
      );

      const v = [...validation];

      if (isDuplicate) {
        v[idx] = { status: "invalid", message: "Duplicate ID Number", loading: false };
        setValidation(v);
        setFormData({ ...formData, participants: updated });
        return;
      }

      v[idx] = { ...v[idx], loading: true };
      setValidation(v);

      try {
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/users/check-participant?id_number=${val}`
        );

        if (!res.data.exists) {
          // Admin can add unregistered users
          v[idx] = { status: "warning", message: "User not in database (Admin override)", loading: false };
          updated[idx] = { ...updated[idx], name: updated[idx].name || "", id_number: val };
        } else if (!res.data.verified) {
          // Admin can add unverified users
          v[idx] = { status: "warning", message: "User not verified (Admin override)", loading: false };
          updated[idx] = {
            ...updated[idx],
            name: res.data.name || updated[idx].name,
            course: res.data.course || updated[idx].course || "",
            year_level: res.data.year_level || updated[idx].year_level || "",
            department: res.data.department || updated[idx].department || "",
            id_number: val,
            role: res.data.role || updated[idx].role || "",
          };
        } else {
          // Verified user
          updated[idx] = {
            name: res.data.name,
            course: res.data.course || "",
            year_level: res.data.year_level || "",
            department: res.data.department || "",
            id_number: val,
            role: res.data.role || "",
          };
          v[idx] = { status: "valid", message: "Verified ✓", loading: false };
        }

        setFormData({ ...formData, participants: updated });
        setValidation(v);
      } catch (err) {
        console.error("Validation error", err);
        v[idx] = { status: "warning", message: "Error validating (Admin can edit manually)", loading: false };
        setValidation(v);
      }
    } else {
      setFormData({ ...formData, participants: updated });
    }
  };

  const addParticipant = () => {
    setFormData({
      ...formData,
      participants: [
        ...formData.participants,
        { name: "", course: "", year_level: "", department: "", id_number: "", role: "" }
      ]
    });
    setValidation([
      ...validation,
      { status: null, message: "", loading: false }
    ]);
  };

  const removeParticipant = (index) => {
    const updatedParticipants = formData.participants.filter((_, i) => i !== index);
    const updatedValidation = validation.filter((_, i) => i !== index);
    setFormData({ ...formData, participants: updatedParticipants });
    setValidation(updatedValidation);
  };

  const searchUsers = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/users/search/users?q=${encodeURIComponent(term)}&verified=true`
      );
      setSearchResults(res.data);
    } catch (err) {
      console.error("User search error:", err);
    }
  };

  const handleSelectUser = (user) => {
    if (currentParticipantIndex !== null) {
      const updated = [...formData.participants];
      const v = [...validation];

      updated[currentParticipantIndex] = {
        name: user.name,
        course: user.course || "",
        year_level: user.year_level || "",
        department: user.department || "",
        id_number: user.id_number,
        role: user.role || "",
      };

      v[currentParticipantIndex] = { status: "valid", message: "Verified ✓", loading: false };

      setFormData({ ...formData, participants: updated });
      setValidation(v);
      setShowUserSearch(false);
      setSearchTerm("");
      setSearchResults([]);
    }
  };

  const validateForm = () => {
    if (!formData.date || !formData.time || !formData.endTime || !formData.purpose) {
      setError("Please complete all required fields.");
      return false;
    }

    // Validate that end time is after start time
    const startDateTime = new Date(`${formData.date}T${formData.time}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
    
    if (endDateTime <= startDateTime) {
      setError("End time must be after start time.");
      return false;
    }

    // Check for past dates
    const now = new Date();
    if (startDateTime < now) {
      setError("Cannot set reservation time in the past.");
      return false;
    }

    // Check if at least one participant has an ID number
    const hasValidParticipant = formData.participants.some(
      p => p.id_number && p.id_number.trim()
    );

    if (!hasValidParticipant) {
      setError("At least one participant must have an ID number.");
      return false;
    }

    // For admin, we don't need to validate all fields or verification status
    // Just check that each participant has at least an ID number or name
    for (let i = 0; i < formData.participants.length; i++) {
      const p = formData.participants[i];
      
      if (!p.id_number && !p.name) {
        setError(`Participant ${i + 1} must have either an ID number or name.`);
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      // Create full datetime objects
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      // Filter out participants with no ID number and no name
      const validParticipants = formData.participants.filter(
        p => (p.id_number && p.id_number.trim()) || (p.name && p.name.trim())
      );

      // Format dates properly for API
      const updateData = {
        datetime: startDateTime.toISOString(),
        endDatetime: endDateTime.toISOString(),
        purpose: formData.purpose,
        participants: validParticipants,
        date: formData.date,
        time: formData.time, // Include time field
        numUsers: validParticipants.length // Update the total number of participants
      };

      console.log("Submitting update:", updateData);

      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}/edit`,
        updateData
      );

      console.log("Update successful:", response.data);

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Reservation update failed:", err);
      
      // Handle specific error messages from the backend
      if (err.response?.data?.message) {
        setError(err.response.data.message);
        
        // If there are invalid participants details
        if (err.response.data.invalidParticipants) {
          console.log("Invalid participants:", err.response.data.invalidParticipants);
        }
      } else {
        setError("Failed to update reservation. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayTime = (timeValue) => {
    const slot = timeSlots.find(t => t.value === timeValue);
    return slot ? slot.display : "Select Time";
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                <Edit className="text-amber-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit Reservation</h2>
                <p className="text-sm text-gray-600">
                  {reservation?.roomName} • {reservation?.location}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Admin Info Banner */}
        <div className="mx-6 mt-4">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 flex items-center gap-3">
            <Shield size={20} className="text-purple-600 flex-shrink-0" />
            <p className="text-purple-700 text-sm">
              Editing as admin. You can modify any field without restrictions.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Floor Validation Warning - For Admin Info Only */}
        {floorValidation && floorValidation.invalidParticipants?.length > 0 && (
          <div className="mx-6 mt-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800 text-sm font-medium mb-2">
                ⚠️ Floor Access Restrictions (For Your Information)
              </p>
              <p className="text-yellow-700 text-sm mb-2">{floorValidation.message}</p>
              <p className="text-yellow-700 text-sm mb-2 font-medium">
                As an admin, you can still save this reservation despite access restrictions.
              </p>
              <ul className="list-disc list-inside text-sm text-yellow-700">
                {floorValidation.invalidParticipants.map((p, i) => (
                  <li key={i}>{p.name} - {p.reason}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-300px)]">
          {/* Basic Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
              <button
                onClick={() => setShowDateModal(true)}
                className="w-full p-3 border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-gray-900">
                  {new Date(formData.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </span>
                <Calendar size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time *</label>
              <button
                onClick={() => setShowTimeModal(true)}
                className="w-full p-3 border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-gray-900">
                  {formatDisplayTime(formData.time)}
                </span>
                <Clock size={18} className="text-gray-400" />
              </button>
            </div>

            {/* End Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time *</label>
              <button
                onClick={() => setShowEndTimeModal(true)}
                className="w-full p-3 border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-gray-900">
                  {formatDisplayTime(formData.endTime)}
                </span>
                <Clock size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  formData.status === "Approved" ? "bg-green-100 text-green-800" :
                  formData.status === "Pending" ? "bg-yellow-100 text-yellow-800" :
                  formData.status === "Ongoing" ? "bg-blue-100 text-blue-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {formData.status}
                </span>
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Purpose *</label>
            <input
              type="text"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Participants Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Participants ({formData.participants.length})
              </label>
              <button
                onClick={addParticipant}
                className="flex items-center gap-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm"
              >
                <Plus size={16} />
                Add Participant
              </button>
            </div>

            <div className="space-y-4">
              {formData.participants.map((participant, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Participant {idx + 1}</h4>
                    <button
                      onClick={() => removeParticipant(idx)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* ID Number */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">ID Number</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={participant.id_number || ''}
                          onChange={(e) => handleParticipantChange(idx, "id_number", e.target.value)}
                          placeholder="Enter ID (optional)"
                          className={`w-full p-2 border rounded-lg text-sm ${
                            validation[idx]?.status === "valid"
                              ? "border-green-500 bg-green-50"
                              : validation[idx]?.status === "invalid"
                              ? "border-red-500 bg-red-50"
                              : validation[idx]?.status === "warning"
                              ? "border-yellow-500 bg-yellow-50"
                              : "border-gray-300"
                          }`}
                        />
                        {validation[idx]?.loading && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-600 border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={participant.name || ''}
                        onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                        placeholder="Full Name"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Department</label>
                      <input
                        type="text"
                        value={participant.department || ''}
                        onChange={(e) => handleParticipantChange(idx, "department", e.target.value)}
                        placeholder="Department"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Course (if student) */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Course</label>
                      <input
                        type="text"
                        value={participant.course || ''}
                        onChange={(e) => handleParticipantChange(idx, "course", e.target.value)}
                        placeholder="Course"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Year Level */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Year Level</label>
                      <input
                        type="text"
                        value={participant.year_level || ''}
                        onChange={(e) => handleParticipantChange(idx, "year_level", e.target.value)}
                        placeholder="Year Level"
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>

                    {/* Role */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Role</label>
                      <select
                        value={participant.role || ''}
                        onChange={(e) => handleParticipantChange(idx, "role", e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="">Select Role</option>
                        <option value="Student">Student</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>

                    {/* Status */}
                    <div className="flex items-center">
                      {validation[idx]?.status === "valid" && (
                        <span className="text-green-600 text-sm flex items-center gap-1">
                          <CheckCircle size={16} />
                          Verified
                        </span>
                      )}
                      {validation[idx]?.status === "invalid" && (
                        <span className="text-red-600 text-sm flex items-center gap-1">
                          <XCircle size={16} />
                          {validation[idx].message}
                        </span>
                      )}
                      {validation[idx]?.status === "warning" && (
                        <span className="text-yellow-600 text-sm flex items-center gap-1">
                          <AlertCircle size={16} />
                          {validation[idx].message}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Search Button */}
                  <button
                    onClick={() => {
                      setCurrentParticipantIndex(idx);
                      setShowUserSearch(true);
                    }}
                    className="mt-3 flex items-center gap-2 text-amber-600 hover:text-amber-800 text-sm"
                  >
                    <Search size={14} />
                    Search User
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <button onClick={() => handleMonthChange(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
                &lt;
              </button>
              <h3 className="text-lg font-semibold">{months[currentMonth]} {currentYear}</h3>
              <button onClick={() => handleMonthChange(1)} className="p-2 hover:bg-gray-100 rounded-lg">
                &gt;
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-4">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                <div key={day} className="text-center text-sm font-medium text-gray-500">{day}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, index) => (
                <div key={index}>
                  {day ? (
                    <button
                      onClick={() => {
                        if (!day.disabled) {
                          setFormData({ ...formData, date: day.date });
                          setShowDateModal(false);
                        }
                      }}
                      disabled={day.disabled}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${
                        day.disabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : formData.date === day.date
                          ? 'bg-amber-600 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {day.day}
                    </button>
                  ) : (
                    <div className="w-10 h-10"></div>
                  )}
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowDateModal(false)}
              className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Start Time Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Select Start Time</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Morning */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Morning</h4>
                <div className="space-y-2">
                  {timeSlots
                    .filter(slot => parseInt(slot.value) < 12)
                    .map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          setFormData({ ...formData, time: slot.value });
                          setShowTimeModal(false);
                        }}
                        className={`w-full p-2 border rounded-lg text-sm ${
                          formData.time === slot.value
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>

              {/* Afternoon */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Afternoon</h4>
                <div className="space-y-2">
                  {timeSlots
                    .filter(slot => parseInt(slot.value) >= 12)
                    .map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          setFormData({ ...formData, time: slot.value });
                          setShowTimeModal(false);
                        }}
                        className={`w-full p-2 border rounded-lg text-sm ${
                          formData.time === slot.value
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowTimeModal(false)}
              className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* End Time Modal */}
      {showEndTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Select End Time</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Morning */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Morning</h4>
                <div className="space-y-2">
                  {timeSlots
                    .filter(slot => parseInt(slot.value) < 12)
                    .map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          setFormData({ ...formData, endTime: slot.value });
                          setShowEndTimeModal(false);
                        }}
                        className={`w-full p-2 border rounded-lg text-sm ${
                          formData.endTime === slot.value
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>

              {/* Afternoon */}
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Afternoon</h4>
                <div className="space-y-2">
                  {timeSlots
                    .filter(slot => parseInt(slot.value) >= 12)
                    .map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          setFormData({ ...formData, endTime: slot.value });
                          setShowEndTimeModal(false);
                        }}
                        className={`w-full p-2 border rounded-lg text-sm ${
                          formData.endTime === slot.value
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowEndTimeModal(false)}
              className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Search Users</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  searchUsers(e.target.value);
                }}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                autoFocus
              />
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map(user => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                      <User size={18} className="text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-sm text-gray-600">{user.id_number}</p>
                      <p className="text-xs text-gray-500">
                        {user.department || 'N/A'} • {user.role || 'Student'}
                      </p>
                    </div>
                  </div>
                </button>
              ))}

              {searchTerm && searchResults.length === 0 && (
                <p className="text-center text-gray-500 py-4">No users found</p>
              )}
            </div>

            <button
              onClick={() => {
                setShowUserSearch(false);
                setSearchTerm("");
                setSearchResults([]);
              }}
              className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEditReservationModal;