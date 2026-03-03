// components/Modals/AdminEditReservationModal.jsx
import React, { useState, useEffect, useRef } from "react";
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
  Shield,
  Mail,
  Phone,
  Loader2,
  UserCheck,
  UserX,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter,
  ChevronDown,
  Sparkles,
  Clock3,
  CalendarDays,
  UserPlus
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [floorValidation, setFloorValidation] = useState(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [searchFilters, setSearchFilters] = useState({
    role: "all",
    department: "all"
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const searchInputRef = useRef(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const departments = [
    "Computer Studies",
    "Engineering",
    "Business",
    "Education",
    "Arts & Sciences",
    "Nursing",
    "Criminal Justice"
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
      
      const formattedDate = startDate.toISOString().split('T')[0];
      
      const formattedStartTime = startDate.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit',
        timeZone: 'UTC'
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

      const v = (reservation.participants || []).map(() => ({
        status: "valid",
        message: "Verified ✓",
        loading: false
      }));
      setValidation(v);
    }
  }, [reservation]);

  useEffect(() => {
    if (showUserSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showUserSearch]);

  const fetchRecentUsers = async () => {
    setLoadingRecent(true);
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/users/recent?limit=5`
      );
      setRecentUsers(res.data.users || []);
    } catch (err) {
      console.error("Failed to fetch recent users:", err);
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    fetchRecentUsers();
  }, []);

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

  // Search users
  const searchUsers = async (term, filters = searchFilters) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL}/api/users/search/users?q=${encodeURIComponent(term)}`;
      
      if (filters.role !== "all") {
        url += `&role=${filters.role}`;
      }
      if (filters.department !== "all") {
        url += `&department=${filters.department}`;
      }
      
      const res = await axios.get(url);
      setSearchResults(res.data);
    } catch (err) {
      console.error("User search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm) {
        searchUsers(searchTerm);
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, searchFilters]);

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
        email: user.email || "",
        contact: user.contact || ""
      };

      v[currentParticipantIndex] = { 
        status: user.verified ? "valid" : "warning", 
        message: user.verified ? "Verified ✓" : "Not verified", 
        loading: false 
      };

      setFormData({ ...formData, participants: updated });
      setValidation(v);
      setShowUserSearch(false);
      setSearchTerm("");
      setSearchResults([]);
    }
  };

  // Validate floor access
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

      setFloorValidation({
        valid: res.data.valid,
        invalidParticipants: res.data.invalidParticipants || [],
        message: res.data.restrictionMessage,
        isAdmin: true
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

    if (field === "id_number" && val.trim().length >= 5) {
      const isDuplicate = formData.participants.some(
        (p, i) => i !== idx && p.id_number === val && p.id_number
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
          v[idx] = { status: "warning", message: "User not in database", loading: false };
        } else if (!res.data.verified) {
          v[idx] = { status: "warning", message: "User not verified", loading: false };
          updated[idx] = {
            ...updated[idx],
            name: res.data.name || updated[idx].name,
            course: res.data.course || updated[idx].course || "",
            year_level: res.data.year_level || updated[idx].year_level || "",
            department: res.data.department || updated[idx].department || "",
            id_number: val,
            role: res.data.role || updated[idx].role || "",
            email: res.data.email || updated[idx].email || "",
            contact: res.data.contact || updated[idx].contact || ""
          };
        } else {
          updated[idx] = {
            name: res.data.name,
            course: res.data.course || "",
            year_level: res.data.year_level || "",
            department: res.data.department || "",
            id_number: val,
            role: res.data.role || "",
            email: res.data.email || "",
            contact: res.data.contact || ""
          };
          v[idx] = { status: "valid", message: "Verified ✓", loading: false };
        }

        setFormData({ ...formData, participants: updated });
        setValidation(v);
      } catch (err) {
        console.error("Validation error", err);
        v[idx] = { status: "warning", message: "Error validating", loading: false };
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
        { 
          name: "", 
          course: "", 
          year_level: "", 
          department: "", 
          id_number: "", 
          role: "",
          email: "",
          contact: ""
        }
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

  const validateForm = () => {
    if (!formData.date || !formData.time || !formData.endTime || !formData.purpose) {
      setError("Please complete all required fields.");
      return false;
    }

    const startDateTime = new Date(`${formData.date}T${formData.time}`);
    const endDateTime = new Date(`${formData.date}T${formData.endTime}`);
    
    if (endDateTime <= startDateTime) {
      setError("End time must be after start time.");
      return false;
    }

    const now = new Date();
    if (startDateTime < now) {
      setError("Cannot set reservation time in the past.");
      return false;
    }

    const hasValidParticipant = formData.participants.some(
      p => p.id_number && p.id_number.trim()
    );

    if (!hasValidParticipant) {
      setError("At least one participant must have an ID number.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const startDateTime = new Date(`${formData.date}T${formData.time}`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}`);

      const validParticipants = formData.participants.filter(
        p => (p.id_number && p.id_number.trim()) || (p.name && p.name.trim())
      );

      const updateData = {
        datetime: startDateTime.toISOString(),
        endDatetime: endDateTime.toISOString(),
        purpose: formData.purpose,
        participants: validParticipants,
        date: formData.date,
        time: formData.time,
        numUsers: validParticipants.length
      };

      const response = await axios.patch(
        `${import.meta.env.VITE_API_URL}/api/reservations/${reservation._id}/edit`,
        updateData
      );

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err) {
      console.error("Reservation update failed:", err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
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

  const getStatusColor = (status) => {
    switch(status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Ongoing': return 'bg-blue-100 text-blue-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      case 'Completed': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Edit className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Reservation</h2>
                <p className="text-amber-100 text-sm">
                  {reservation?.roomName} • {reservation?.location}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={() => setActiveTab("basic")}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "basic"
                  ? 'bg-white text-amber-700 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab("participants")}
              className={`px-6 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === "participants"
                  ? 'bg-white text-amber-700 shadow-lg'
                  : 'text-white hover:bg-white/20'
              }`}
            >
              Participants ({formData.participants.length})
            </button>
          </div>
        </div>

        {/* Admin Info Banner */}
        <div className="mx-6 mt-4">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
            <Shield size={20} className="text-purple-700" />
            <p className="text-purple-800 text-sm">
              Editing as admin. You can modify any field without restrictions.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 animate-slideDown">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Floor Validation Warning */}
        {floorValidation && floorValidation.invalidParticipants?.length > 0 && (
          <div className="mx-6 mt-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={20} className="text-amber-600" />
                <p className="text-amber-800 font-medium">Floor Access Notice</p>
              </div>
              <p className="text-amber-700 text-sm mb-2">{floorValidation.message}</p>
              <p className="text-amber-700 text-sm mb-2 font-medium">
                As admin, you can override these restrictions.
              </p>
              <div className="bg-amber-100/50 rounded-lg p-3">
                <p className="text-amber-800 text-sm font-medium mb-2">Restricted participants:</p>
                <ul className="space-y-1">
                  {floorValidation.invalidParticipants.map((p, i) => (
                    <li key={i} className="text-sm text-amber-700 flex items-center gap-2">
                      <UserX size={14} />
                      <span>{p.name} - {p.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-320px)]">
          {activeTab === "basic" && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays size={20} className="text-amber-600" />
                Reservation Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowDateModal(true)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl flex items-center justify-between hover:border-amber-400 hover:bg-amber-50/50 transition-all"
                  >
                    <span className="text-gray-900 font-medium">
                      {new Date(formData.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      })}
                    </span>
                    <Calendar size={18} className="text-amber-600" />
                  </button>
                </div>

                {/* Start Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Time <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowTimeModal(true)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl flex items-center justify-between hover:border-amber-400 hover:bg-amber-50/50 transition-all"
                  >
                    <span className="text-gray-900 font-medium">
                      {formatDisplayTime(formData.time)}
                    </span>
                    <Clock size={18} className="text-amber-600" />
                  </button>
                </div>

                {/* End Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Time <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowEndTimeModal(true)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl flex items-center justify-between hover:border-amber-400 hover:bg-amber-50/50 transition-all"
                  >
                    <span className="text-gray-900 font-medium">
                      {formatDisplayTime(formData.endTime)}
                    </span>
                    <Clock size={18} className="text-amber-600" />
                  </button>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className={`px-4 py-3 border-2 border-gray-200 rounded-xl ${getStatusColor(formData.status)}`}>
                    <span className="font-medium">{formData.status}</span>
                  </div>
                </div>
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <FileText size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    className="w-full pl-10 pr-4 p-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === "participants" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={20} className="text-amber-600" />
                  Participants ({formData.participants.length})
                </h3>
                <button
                  onClick={addParticipant}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all shadow-md hover:shadow-lg"
                >
                  <UserPlus size={18} />
                  Add Participant
                </button>
              </div>

              <div className="space-y-4">
                {formData.participants.map((participant, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-amber-200 transition-all"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          validation[idx]?.status === "valid" ? "bg-green-100" :
                          validation[idx]?.status === "warning" ? "bg-yellow-100" : "bg-gray-100"
                        }`}>
                          {validation[idx]?.status === "valid" ? (
                            <UserCheck size={20} className="text-green-600" />
                          ) : validation[idx]?.status === "warning" ? (
                            <AlertCircle size={20} className="text-yellow-600" />
                          ) : (
                            <User size={20} className="text-gray-600" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            Participant {idx + 1}
                          </h4>
                          {validation[idx]?.status && (
                            <span className={`text-xs font-medium ${
                              validation[idx].status === "valid" ? "text-green-600" :
                              validation[idx].status === "warning" ? "text-yellow-600" : "text-red-600"
                            }`}>
                              {validation[idx].message}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeParticipant(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* ID Number */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          ID Number
                        </label>
                        <div className="relative">
                          <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={participant.id_number || ''}
                            onChange={(e) => handleParticipantChange(idx, "id_number", e.target.value)}
                            placeholder="Enter ID"
                            className={`w-full pl-9 pr-4 p-2.5 border-2 rounded-xl text-sm transition-all ${
                              validation[idx]?.status === "valid"
                                ? "border-green-500 bg-green-50"
                                : validation[idx]?.status === "invalid"
                                ? "border-red-500 bg-red-50"
                                : validation[idx]?.status === "warning"
                                ? "border-yellow-500 bg-yellow-50"
                                : "border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                            }`}
                          />
                          {validation[idx]?.loading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 size={16} className="animate-spin text-amber-600" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={participant.name || ''}
                            onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                            placeholder="Full name"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          />
                        </div>
                      </div>

                      {/* Email */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                        <div className="relative">
                          <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="email"
                            value={participant.email || ''}
                            onChange={(e) => handleParticipantChange(idx, "email", e.target.value)}
                            placeholder="Email"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          />
                        </div>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                        <div className="relative">
                          <Building size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            value={participant.department || ''}
                            onChange={(e) => handleParticipantChange(idx, "department", e.target.value)}
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 appearance-none"
                          >
                            <option value="">Select Department</option>
                            {departments.map(dept => (
                              <option key={dept} value={dept}>{dept}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Course */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Course</label>
                        <div className="relative">
                          <BookOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={participant.course || ''}
                            onChange={(e) => handleParticipantChange(idx, "course", e.target.value)}
                            placeholder="Course"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          />
                        </div>
                      </div>

                      {/* Year Level */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Year Level</label>
                        <div className="relative">
                          <GraduationCap size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={participant.year_level || ''}
                            onChange={(e) => handleParticipantChange(idx, "year_level", e.target.value)}
                            placeholder="Year level"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          />
                        </div>
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                        <div className="relative">
                          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            value={participant.role || ''}
                            onChange={(e) => handleParticipantChange(idx, "role", e.target.value)}
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200 appearance-none"
                          >
                            <option value="">Select Role</option>
                            <option value="Student">Student</option>
                            <option value="Faculty">Faculty</option>
                            <option value="Staff">Staff</option>
                          </select>
                        </div>
                      </div>

                      {/* Contact */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Contact No.</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="tel"
                            value={participant.contact || ''}
                            onChange={(e) => handleParticipantChange(idx, "contact", e.target.value)}
                            placeholder="Contact number"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentParticipantIndex(idx);
                        setShowUserSearch(true);
                      }}
                      className="mt-4 flex items-center gap-2 text-amber-600 hover:text-amber-800 text-sm font-medium transition-colors"
                    >
                      <Search size={14} />
                      Search existing user
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-xl hover:from-amber-700 hover:to-amber-800 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
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
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select Date</h3>
              <button
                onClick={() => setShowDateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => handleMonthChange(-1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <h4 className="text-lg font-semibold text-gray-900">
                {months[currentMonth]} {currentYear}
              </h4>
              <button
                onClick={() => handleMonthChange(1)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ChevronRight size={20} />
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
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                        day.disabled
                          ? 'text-gray-300 cursor-not-allowed bg-gray-50'
                          : formData.date === day.date
                          ? 'bg-amber-600 text-white shadow-md scale-105'
                          : 'hover:bg-amber-50 hover:text-amber-600 hover:scale-105'
                      }`}
                    >
                      {day.day}
                    </button>
                  ) : (
                    <div className="w-12 h-12"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Start Time Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select Start Time</h3>
              <button
                onClick={() => setShowTimeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock3 size={18} className="text-amber-600" />
                  Morning
                </h4>
                <div className="space-y-3">
                  {timeSlots
                    .filter(slot => parseInt(slot.value) < 12)
                    .map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          setFormData({ ...formData, time: slot.value });
                          setShowTimeModal(false);
                        }}
                        className={`w-full p-3 border-2 rounded-xl text-sm font-medium transition-all ${
                          formData.time === slot.value
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105'
                            : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-amber-600" />
                  Afternoon
                </h4>
                <div className="space-y-3">
                  {timeSlots
                    .filter(slot => parseInt(slot.value) >= 12)
                    .map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          setFormData({ ...formData, time: slot.value });
                          setShowTimeModal(false);
                        }}
                        className={`w-full p-3 border-2 rounded-xl text-sm font-medium transition-all ${
                          formData.time === slot.value
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105'
                            : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Time Modal */}
      {showEndTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select End Time</h3>
              <button
                onClick={() => setShowEndTimeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock3 size={18} className="text-amber-600" />
                  Morning
                </h4>
                <div className="space-y-3">
                  {timeSlots
                    .filter(slot => parseInt(slot.value) < 12)
                    .map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          setFormData({ ...formData, endTime: slot.value });
                          setShowEndTimeModal(false);
                        }}
                        className={`w-full p-3 border-2 rounded-xl text-sm font-medium transition-all ${
                          formData.endTime === slot.value
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105'
                            : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-amber-600" />
                  Afternoon
                </h4>
                <div className="space-y-3">
                  {timeSlots
                    .filter(slot => parseInt(slot.value) >= 12)
                    .map(slot => (
                      <button
                        key={slot.value}
                        onClick={() => {
                          setFormData({ ...formData, endTime: slot.value });
                          setShowEndTimeModal(false);
                        }}
                        className={`w-full p-3 border-2 rounded-xl text-sm font-medium transition-all ${
                          formData.endTime === slot.value
                            ? 'bg-amber-600 text-white border-amber-600 shadow-md scale-105'
                            : 'border-gray-200 hover:border-amber-300 hover:bg-amber-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-amber-600 to-amber-700 p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <Search size={24} className="text-white" />
                  <h3 className="text-xl font-bold text-white">Search Users</h3>
                </div>
                <button
                  onClick={() => {
                    setShowUserSearch(false);
                    setSearchTerm("");
                    setSearchResults([]);
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Search Input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, ID, email, or department..."
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={20} className="animate-spin text-amber-600" />
                  </div>
                )}
              </div>

              {/* Filters */}
              <div className="mb-4">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Filter size={16} />
                  Filters
                  <ChevronDown size={16} className={`transform transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>

                {showFilters && (
                  <div className="mt-3 grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl animate-slideDown">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                      <select
                        value={searchFilters.role}
                        onChange={(e) => setSearchFilters({ ...searchFilters, role: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="all">All Roles</option>
                        <option value="Student">Student</option>
                        <option value="Faculty">Faculty</option>
                        <option value="Staff">Staff</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                      <select
                        value={searchFilters.department}
                        onChange={(e) => setSearchFilters({ ...searchFilters, department: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="all">All Departments</option>
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Recent Users */}
              {!searchTerm && recentUsers.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Clock size={16} />
                      Recent Users
                    </h4>
                    <button
                      onClick={fetchRecentUsers}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {recentUsers.map(user => (
                      <button
                        key={user._id}
                        onClick={() => handleSelectUser(user)}
                        className="p-3 border border-gray-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center">
                            <User size={18} className="text-amber-700" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>{user.id_number}</span>
                              <span>•</span>
                              <span>{user.department || 'N/A'}</span>
                            </div>
                          </div>
                          {user.verified && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              Verified
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.length > 0 ? (
                  searchResults.map(user => (
                    <button
                      key={user._id}
                      onClick={() => handleSelectUser(user)}
                      className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-amber-300 hover:bg-amber-50 transition-all text-left group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <User size={20} className="text-amber-700" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-semibold text-gray-900">{user.name}</p>
                            {user.verified ? (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                                <CheckCircle size={12} />
                                Verified
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                                Unverified
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-1 text-gray-600">
                              <IdCard size={14} />
                              <span className="font-mono">{user.id_number}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Mail size={14} />
                              <span className="truncate">{user.email || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600">
                              <Building size={14} />
                              <span>{user.department || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600">
                              <GraduationCap size={14} />
                              <span>{user.role || 'Student'}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all" />
                      </div>
                    </button>
                  ))
                ) : searchTerm && !searchLoading ? (
                  <div className="text-center py-12">
                    <UserX size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500 font-medium">No users found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <button
                onClick={() => {
                  setShowUserSearch(false);
                  setSearchTerm("");
                  setSearchResults([]);
                }}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out;
        }
        
        .animate-slideDown {
          animation: slideDown 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default AdminEditReservationModal;