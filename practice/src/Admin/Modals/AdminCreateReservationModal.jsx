// components/Modals/AdminCreateReservationModal.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import moment from "moment-timezone";
import {
  X,
  Calendar,
  Clock,
  Users,
  Home,
  AlertCircle,
  CheckCircle,
  XCircle,
  Search,
  User,
  Plus,
  Trash2,
  ChevronRight,
  Shield,
  Mail,
  Phone,
  Building2,
  GraduationCap,
  BookOpen,
  IdCard,
  Filter,
  Loader2,
  UserCheck,
  UserX,
  MapPin,
  Clock3,
  CalendarDays,
  FileText,
  ChevronLeft,
  ChevronDown,
  Sparkles,
  UserPlus,
  RefreshCw
} from "lucide-react";
import { getRoomImageById } from "../../data/roomImages";

const AdminCreateReservationModal = ({ onClose, onSuccess, currentAdmin }) => {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    numUsers: "1",
    purpose: "",
    location: "",
    roomName: "",
    room_Id: "",
    createdByAdmin: true,
    createdByAdminId: currentAdmin?._id || "",
    createdByAdminName: currentAdmin?.name || "Admin",
    participants: [
      {
        name: "",
        course: "",
        year_level: "",
        department: "",
        id_number: "",
        role: "",
        email: "",
        contact: ""
      },
    ],
  });

  const [validation, setValidation] = useState([
    { status: null, message: "", loading: false }
  ]);
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [floorValidation, setFloorValidation] = useState(null);
  const [searchFilters, setSearchFilters] = useState({
    role: "all",
    department: "all"
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  const [step, setStep] = useState(1);
  const searchInputRef = useRef(null);

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

  const roomLocations = [
    { id: "Ground Floor", label: "Ground Floor", icon: "🏢" },
    { id: "2nd Floor", label: "2nd Floor", icon: "🏛️" },
    { id: "4th Floor", label: "4th Floor", icon: "🏫" },
    { id: "5th Floor", label: "5th Floor", icon: "🏬" }
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

  // Calendar functions
  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const generateCalendarDays = useCallback((month, year) => {
    const days = [];
    const totalDays = daysInMonth(month, year);
    const firstDay = firstDayOfMonth(month, year);
    const now = new Date();
    const today = now.getDate();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    for (let i = 0; i < firstDay; i++) days.push(null);

    for (let i = 1; i <= totalDays; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dateObj = new Date(year, month, i);
      const isSunday = dateObj.getDay() === 0;
      const isPastDate = year < currentYear || 
                       (year === currentYear && month < currentMonth) || 
                       (year === currentYear && month === currentMonth && i < today);
      
      days.push({ 
        day: i, 
        date: dateStr, 
        disabled: isPastDate || isSunday,
        isSunday: isSunday
      });
    }

    return days;
  }, []);

  useEffect(() => {
    setCalendarDays(generateCalendarDays(currentMonth, currentYear));
  }, [currentMonth, currentYear, generateCalendarDays]);

  useEffect(() => {
    fetchRooms();
    fetchRecentUsers();
  }, []);

  useEffect(() => {
    if (showUserSearch && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showUserSearch]);

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`);
      setRooms(res.data);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    }
  };

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

  const handleNumUsersChange = (val) => {
    const n = parseInt(val, 10);
    const updated = [...formData.participants];
    const v = [...validation];
    
    while (updated.length < n) {
      updated.push({ 
        name: "", 
        course: "", 
        year_level: "", 
        department: "", 
        id_number: "", 
        role: "",
        email: "",
        contact: ""
      });
      v.push({ status: null, message: "", loading: false });
    }

    if (n < updated.length) {
      updated.length = n;
      v.length = n;
    }
    
    setFormData(prev => ({ ...prev, numUsers: val, participants: updated }));
    setValidation(v);
    setShowUsersModal(false);
  };

  // Search for users with filters
  const searchUsers = async (term, filters = searchFilters) => {
    if (!term.trim() && term.length > 0) return;

    setSearchLoading(true);
    try {
      const baseURL = import.meta.env.VITE_API_URL;
      let url = `${baseURL}/api/users/search/users?q=${encodeURIComponent(term)}&verified=true`;
      
      if (filters.role !== "all") {
        url += `&role=${filters.role}`;
      }
      if (filters.department !== "all") {
        url += `&department=${filters.department}`;
      }
      
      const res = await axios.get(url);
      setSearchResults(res.data || []);
    } catch (err) {
      console.error("User search error:", err);
      setSearchResults([]);
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

  // Validate participant
  const validateParticipant = async (idx, idNumber) => {
    const updated = [...formData.participants];
    const v = [...validation];

    // Check for duplicate ID numbers
    const isDuplicate = formData.participants.some(
      (p, i) => i !== idx && p.id_number === idNumber && p.id_number
    );

    if (isDuplicate) {
      v[idx] = { status: "invalid", message: "Duplicate ID Number", loading: false };
      setValidation(v);
      return false;
    }

    v[idx] = { ...v[idx], loading: true };
    setValidation(v);

    try {
      const baseURL = import.meta.env.VITE_API_URL;
      const res = await axios.get(
        `${baseURL}/api/users/check-participant?id_number=${idNumber}`
      );

      if (res.data.exists) {
        if (res.data.verified) {
          updated[idx] = {
            name: res.data.name,
            course: res.data.course || "",
            year_level: res.data.year_level || "",
            department: res.data.department || "",
            id_number: res.data.id_number,
            role: res.data.role || "",
            email: res.data.email || "",
            contact: res.data.contact || ""
          };
          v[idx] = { status: "valid", message: "Verified ✓", loading: false };
        } else {
          updated[idx] = {
            name: res.data.name,
            course: res.data.course || "",
            year_level: res.data.year_level || "",
            department: res.data.department || "",
            id_number: res.data.id_number,
            role: res.data.role || "",
            email: res.data.email || "",
            contact: res.data.contact || ""
          };
          v[idx] = { status: "warning", message: "User not verified", loading: false };
        }
        setFormData({ ...formData, participants: updated });
        setValidation(v);
        return true;
      } else {
        v[idx] = { status: "warning", message: "User not in database", loading: false };
        setValidation(v);
        updated[idx].id_number = idNumber;
        setFormData({ ...formData, participants: updated });
        return false;
      }
    } catch (err) {
      console.error("Validation error", err);
      v[idx] = { status: "warning", message: "Error validating", loading: false };
      setValidation(v);
      return false;
    }
  };

  const handleParticipantChange = async (idx, field, val) => {
    const updated = [...formData.participants];
    
    if (field === "id_number") {
      val = val.replace(/\D/g, '');
    }

    updated[idx][field] = val;

    if (field === "id_number" && val.trim().length >= 5) {
      await validateParticipant(idx, val);
    } else {
      setFormData({ ...formData, participants: updated });
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

  const addNewParticipant = () => {
    setCurrentParticipantIndex(formData.participants.length);
    setShowUserSearch(true);
  };

  // Validate floor access
  const validateFloorAccess = async () => {
    if (!formData.location || formData.participants.length === 0) return;

    const participantIds = formData.participants
      .filter(p => p.id_number && p.id_number.trim())
      .map(p => p.id_number);

    if (participantIds.length === 0) return;

    setFloorValidation({ loading: true });

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/validate-floor-access`,
        {
          location: formData.location,
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
    if (formData.location && formData.participants.some(p => p.id_number)) {
      validateFloorAccess();
    }
  }, [formData.location, JSON.stringify(formData.participants.map(p => p.id_number))]);

  const handleRoomSelect = (room) => {
    if (!room.isActive) {
      setError("This room is currently unavailable.");
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      roomName: room.room,
      room_Id: room._id,
    }));
    setSelectedRoomDetails(room);
    setError("");
  };

  const validateForm = () => {
    if (!formData.date) {
      setError("Please select a date.");
      return false;
    }
    if (!formData.time) {
      setError("Please select a time.");
      return false;
    }
    if (!formData.location) {
      setError("Please select a location.");
      return false;
    }
    if (!formData.roomName) {
      setError("Please select a room.");
      return false;
    }
    if (!formData.purpose || !formData.purpose.trim()) {
      setError("Please enter a purpose.");
      return false;
    }

    const selectedRoom = rooms.find(room => room._id === formData.room_Id);
    if (selectedRoom && !selectedRoom.isActive) {
      setError("This room is currently unavailable.");
      return false;
    }

    const now = new Date();
    const selectedDate = new Date(`${formData.date}T${formData.time}`);
    if (selectedDate < now) {
      setError("Cannot create reservation in the past.");
      return false;
    }

    const hasAtLeastOneParticipant = formData.participants.some(
      p => p.id_number && p.id_number.trim()
    );

    if (!hasAtLeastOneParticipant) {
      setError("Please add at least one participant with an ID number.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    try {
      const manilaTime = moment.tz(
        `${formData.date}T${formData.time}`,
        "YYYY-MM-DDTHH:mm",
        "Asia/Manila"
      );

      const endManilaTime = manilaTime.clone().add(2, 'hours');

      const validParticipants = formData.participants.filter(
        p => p.id_number && p.id_number.trim()
      );

      const reservationData = {
        createdByAdmin: true,
        createdByAdminId: currentAdmin?._id,
        createdByAdminName: currentAdmin?.name,
        room_Id: formData.room_Id,
        roomName: formData.roomName,
        location: formData.location,
        datetime: manilaTime.format(),
        date: formData.date,
        time: formData.time,
        endDatetime: endManilaTime.format(),
        numUsers: validParticipants.length,
        purpose: formData.purpose,
        participants: validParticipants,
        status: "Approved",
      };

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/admin-create`,
        reservationData
      );
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("❌ Reservation creation failed:", err);
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          "Failed to create reservation";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getRoomImage = (room) => {
    if (room.image && room.image.url) {
      return room.image.url;
    }

    const directMappings = {
      "Discussion Room 1": "discussion_room_1",
      "Discussion Room 2": "discussion_room_2",
      "Discussion Room 3": "discussion_room_3",
      "Graduate Research Hub 1": "graduate_hub_1",
      "Graduate Research Hub 2": "graduate_hub_2", 
      "Graduate Research Hub 3": "graduate_hub_3",
      "2nd Floor Discussion Room 1": "2nd_discussion_room_1_2",
      "2nd Floor Discussion Room 2": "2nd_discussion_room_2_2",
      "2nd Floor Faculty Room": "2nd_faculty_room_1_2",
      "Faculty Room": "faculty_room",
      "Collaboration Room": "collab_room",
    };

    const imageId = directMappings[room.room];
    if (imageId) {
      const image = getRoomImageById(imageId);
      if (image?.url) return image.url;
    }

    if (room.floor === "Ground Floor") return getRoomImageById("ground_floor")?.url;
    if (room.floor === "2nd Floor") return getRoomImageById("second_floor_1")?.url;
    return getRoomImageById("fifth_floor")?.url;
  };

  const formatDisplayTime = (timeValue) => {
    const slot = timeSlots.find(t => t.value === timeValue);
    return slot ? slot.display : "Select Time";
  };

  const getParticipantIcon = (participant) => {
    if (!participant.role) return <User size={16} />;
    switch (participant.role.toLowerCase()) {
      case 'faculty': return <GraduationCap size={16} />;
      case 'staff': return <Building2 size={16} />;
      default: return <User size={16} />;
    }
  };

  const nextStep = () => {
    if (step === 1 && formData.date && formData.time && formData.location) {
      setStep(2);
    } else if (step === 2 && formData.roomName) {
      setStep(3);
    }
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-7xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Calendar className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Create New Reservation</h2>
                <p className="text-blue-100 text-sm">Fill in the details to create a reservation as admin</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-6 gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                  step >= s 
                    ? 'bg-white text-blue-600 font-bold shadow-lg' 
                    : 'bg-white/30 text-white'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <div className={`w-16 h-1 mx-2 rounded ${
                    step > s ? 'bg-white' : 'bg-white/30'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Admin Info Banner */}
        <div className="mx-6 mt-4">
          <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
              <Shield size={20} className="text-purple-700" />
            </div>
            <div>
              <p className="text-purple-800 font-medium">
                Creating reservation as <span className="font-bold">{currentAdmin?.name || "Admin"}</span>
              </p>
              <p className="text-purple-600 text-sm">
                Reservations created by admin are automatically approved
              </p>
            </div>
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
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-280px)]">
          {step === 1 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <CalendarDays size={20} className="text-blue-600" />
                Basic Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Date */}
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowDateModal(true)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl flex items-center justify-between hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                  >
                    <span className={formData.date ? "text-gray-900 font-medium" : "text-gray-400"}>
                      {formData.date ? new Date(formData.date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                      }) : "Select Date"}
                    </span>
                    <Calendar size={18} className={formData.date ? "text-blue-600" : "text-gray-400"} />
                  </button>
                </div>

                {/* Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowTimeModal(true)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl flex items-center justify-between hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    <span className={formData.time ? "text-gray-900 font-medium" : "text-gray-400"}>
                      {formData.time ? formatDisplayTime(formData.time) : "Select Time"}
                    </span>
                    <Clock size={18} className={formData.time ? "text-blue-600" : "text-gray-400"} />
                  </button>
                </div>

                {/* Number of Users */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Participants <span className="text-red-500">*</span>
                  </label>
                  <button
                    onClick={() => setShowUsersModal(true)}
                    className="w-full p-3 border-2 border-gray-200 rounded-xl flex items-center justify-between hover:border-blue-400 hover:bg-blue-50/50 transition-all"
                  >
                    <span className={formData.numUsers ? "text-gray-900 font-medium" : "text-gray-400"}>
                      {formData.numUsers ? `${formData.numUsers} Participant${formData.numUsers > 1 ? 's' : ''}` : "Select Number"}
                    </span>
                    <Users size={18} className={formData.numUsers ? "text-blue-600" : "text-gray-400"} />
                  </button>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purpose <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="e.g., Study Session, Meeting"
                    className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  />
                </div>
              </div>

              {/* Location Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Location <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {roomLocations.map((loc) => (
                    <button
                      key={loc.id}
                      onClick={() => setFormData({ ...formData, location: loc.id, roomName: "", room_Id: "" })}
                      className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all hover:scale-105 ${
                        formData.location === loc.id
                          ? "border-blue-500 bg-blue-50 shadow-md"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-2xl">{loc.icon}</span>
                      <span className="font-medium text-sm">{loc.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && formData.location && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Home size={20} className="text-blue-600" />
                Select Room on {formData.location}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {rooms
                  .filter(room => room.floor === formData.location)
                  .map((room) => {
                    const roomImage = getRoomImage(room);
                    const isSelected = formData.room_Id === room._id;
                    const isAvailable = room.isActive;

                    return (
                      <button
                        key={room._id}
                        onClick={() => handleRoomSelect(room)}
                        disabled={!isAvailable}
                        className={`group relative border-2 rounded-xl overflow-hidden transition-all ${
                          isSelected
                            ? "border-blue-500 ring-4 ring-blue-200 scale-[1.02] shadow-xl"
                            : isAvailable
                            ? "border-gray-200 hover:border-blue-300 hover:shadow-lg"
                            : "border-gray-200 opacity-60 cursor-not-allowed"
                        }`}
                      >
                        {roomImage && (
                          <>
                            <img
                              src={roomImage}
                              alt={room.room}
                              className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
                          </>
                        )}
                        
                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                          <h3 className="font-bold text-lg mb-1">{room.room}</h3>
                          <div className="flex items-center gap-3 text-sm mb-2">
                            <span className="flex items-center gap-1">
                              <Users size={14} />
                              Capacity: {room.capacity}
                            </span>
                          </div>
                          
                          {room.features && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(room.features).map(([feature, enabled]) => 
                                enabled && (
                                  <span key={feature} className="text-xs bg-white/20 backdrop-blur-sm px-2 py-1 rounded-full">
                                    {feature}
                                  </span>
                                )
                              )}
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                            Selected
                          </div>
                        )}

                        {!isAvailable && (
                          <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                            Unavailable
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={20} className="text-blue-600" />
                  Participants ({formData.participants.length})
                </h3>
                <button
                  onClick={addNewParticipant}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-md hover:shadow-lg"
                >
                  <UserPlus size={18} />
                  Add Participant
                </button>
              </div>

              <div className="space-y-4">
                {formData.participants.map((participant, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-blue-200 transition-all"
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
                        onClick={() => {
                          if (formData.participants.length > 1) {
                            const updated = formData.participants.filter((_, i) => i !== idx);
                            const v = validation.filter((_, i) => i !== idx);
                            setFormData({ ...formData, participants: updated, numUsers: updated.length.toString() });
                            setValidation(v);
                          }
                        }}
                        disabled={formData.participants.length === 1}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {/* ID Number */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          ID Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <IdCard size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={participant.id_number}
                            onChange={(e) => handleParticipantChange(idx, "id_number", e.target.value)}
                            placeholder="Enter ID number"
                            className={`w-full pl-9 pr-4 p-2.5 border-2 rounded-xl text-sm transition-all ${
                              validation[idx]?.status === "valid"
                                ? "border-green-500 bg-green-50"
                                : validation[idx]?.status === "invalid"
                                ? "border-red-500 bg-red-50"
                                : validation[idx]?.status === "warning"
                                ? "border-yellow-500 bg-yellow-50"
                                : "border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                            }`}
                          />
                          {validation[idx]?.loading && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 size={16} className="animate-spin text-blue-600" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Full Name</label>
                        <div className="relative">
                          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            value={participant.name}
                            onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                            placeholder="Full name"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                            placeholder="Email address"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                      </div>

                      {/* Department */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
                        <div className="relative">
                          <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            value={participant.department}
                            onChange={(e) => handleParticipantChange(idx, "department", e.target.value)}
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 appearance-none"
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
                            value={participant.course}
                            onChange={(e) => handleParticipantChange(idx, "course", e.target.value)}
                            placeholder="Course"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                            value={participant.year_level}
                            onChange={(e) => handleParticipantChange(idx, "year_level", e.target.value)}
                            placeholder="Year level"
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                      </div>

                      {/* Role */}
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
                        <div className="relative">
                          <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <select
                            value={participant.role}
                            onChange={(e) => handleParticipantChange(idx, "role", e.target.value)}
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 appearance-none"
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
                            className="w-full pl-9 pr-4 p-2.5 border-2 border-gray-200 rounded-xl text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setCurrentParticipantIndex(idx);
                        setShowUserSearch(true);
                      }}
                      className="mt-4 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
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
          <div className="flex justify-between items-center">
            <button
              onClick={step > 1 ? prevStep : onClose}
              className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-xl hover:bg-gray-50 transition-all font-medium flex items-center gap-2"
            >
              {step > 1 ? (
                <>
                  <ChevronLeft size={18} />
                  Back
                </>
              ) : (
                "Cancel"
              )}
            </button>
            
            <div className="flex gap-3">
              {step < 3 ? (
                <button
                  onClick={nextStep}
                  disabled={step === 1 && (!formData.date || !formData.time || !formData.location)}
                  className="px-8 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all font-medium flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle size={18} />
                      Create Reservation
                    </>
                  )}
                </button>
              )}
            </div>
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
                          ? 'bg-blue-600 text-white shadow-md scale-105'
                          : 'hover:bg-blue-50 hover:text-blue-600 hover:scale-105'
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

      {/* Time Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Select Time</h3>
              <button
                onClick={() => setShowTimeModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Morning */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock3 size={18} className="text-blue-600" />
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
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {slot.display}
                      </button>
                    ))}
                </div>
              </div>

              {/* Afternoon */}
              <div>
                <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" />
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
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md scale-105'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
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

      {/* Users Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full animate-scaleIn">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">Number of Participants</h3>
              <button
                onClick={() => setShowUsersModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumUsersChange(num.toString())}
                  className={`p-4 border-2 rounded-xl text-center transition-all hover:scale-105 ${
                    formData.numUsers === num.toString()
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }`}
                >
                  <div className="text-2xl font-bold mb-1">{num}</div>
                  <div className="text-sm">{num === 1 ? 'Participant' : 'Participants'}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced User Search Modal */}
      {showUserSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-hidden animate-scaleIn">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6">
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
                  className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 size={20} className="animate-spin text-blue-600" />
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
                        className="p-3 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center">
                            <User size={18} className="text-blue-700" />
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
                      className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-left group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                          <User size={20} className="text-blue-700" />
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
                              <Building2 size={14} />
                              <span>{user.department || 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-gray-600">
                              <GraduationCap size={14} />
                              <span>{user.role || 'Student'}</span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
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

export default AdminCreateReservationModal;