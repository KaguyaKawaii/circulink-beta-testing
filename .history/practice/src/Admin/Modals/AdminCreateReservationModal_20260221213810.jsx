// components/Modals/AdminCreateReservationModal.jsx
import React, { useState, useEffect, useCallback } from "react";
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
  ChevronRight
} from "lucide-react";
import { getRoomImageById } from "../../data/roomImages";

const AdminCreateReservationModal = ({ onClose, onSuccess, currentUser }) => {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    numUsers: "4",
    purpose: "",
    location: "",
    roomName: "",
    room_Id: "",
    mainUserId: "", // Add this field for the main user
    mainUserName: "", // Add this for display
    participants: Array.from({ length: 4 }, () => ({
      name: "",
      course: "",
      year_level: "",
      department: "",
      id_number: "",
      role: "",
    })),
  });

  const [validation, setValidation] = useState(
    Array.from({ length: 4 }, () => ({ status: null, message: "", loading: false }))
  );
  
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [showMainUserSearch, setShowMainUserSearch] = useState(false); // New state for main user search
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [mainUserSearchTerm, setMainUserSearchTerm] = useState(""); // For main user search
  const [mainUserSearchResults, setMainUserSearchResults] = useState([]); // For main user search results
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [currentParticipantIndex, setCurrentParticipantIndex] = useState(null);
  const [calendarDays, setCalendarDays] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mainUserSearchLoading, setMainUserSearchLoading] = useState(false); // Loading for main user search
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

  const roomLocations = ["Ground Floor", "2nd Floor", "4th Floor", "5th Floor"];

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
  }, []);

  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`);
      setRooms(res.data);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
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
      updated.push({ name: "", course: "", year_level: "", department: "", id_number: "", role: "" });
      v.push({ status: null, message: "", loading: false });
    }

    updated.length = n;
    v.length = n;
    
    setFormData(prev => ({ ...prev, numUsers: val, participants: updated }));
    setValidation(v);
    setShowUsersModal(false);
  };

  // Search for main user
  const searchMainUsers = async (term) => {
    if (!term.trim()) {
      setMainUserSearchResults([]);
      return;
    }

    setMainUserSearchLoading(true);
    try {
      const baseURL = import.meta.env.VITE_API_URL;
      const url = `${baseURL}/api/users/search/users?q=${encodeURIComponent(term)}&verified=true`;
      
      console.log("Searching main users at:", url);
      
      const res = await axios.get(url);
      
      setMainUserSearchResults(res.data || []);
      console.log("Main user search results:", res.data);
    } catch (err) {
      console.error("Main user search error:", err);
      setMainUserSearchResults([]);
    } finally {
      setMainUserSearchLoading(false);
    }
  };

  // Select main user
  const handleSelectMainUser = (user) => {
    setFormData({
      ...formData,
      mainUserId: user._id,
      mainUserName: user.name
    });
    
    // Auto-fill the first participant with the main user
    const updatedParticipants = [...formData.participants];
    const v = [...validation];
    
    updatedParticipants[0] = {
      name: user.name,
      course: user.course || "",
      year_level: user.year_level || "",
      department: user.department || "",
      id_number: user.id_number,
      role: user.role || "",
    };
    
    v[0] = { status: "valid", message: "Verified ✓", loading: false };
    
    setFormData(prev => ({ ...prev, participants: updatedParticipants }));
    setValidation(v);
    setShowMainUserSearch(false);
    setMainUserSearchTerm("");
    setMainUserSearchResults([]);
  };

  // Validate participant
  const validateParticipant = async (idx, idNumber) => {
    const updated = [...formData.participants];
    const v = [...validation];

    // Check for duplicate ID numbers
    const isDuplicate = formData.participants.some(
      (p, i) => i !== idx && p.id_number === idNumber
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
          };
          v[idx] = { status: "valid", message: "Verified ✓", loading: false };
          setFormData({ ...formData, participants: updated });
          setValidation(v);
          return true;
        } else {
          v[idx] = { status: "invalid", message: "User not verified", loading: false };
          setValidation(v);
          return false;
        }
      } else {
        v[idx] = { status: "invalid", message: "User not found", loading: false };
        setValidation(v);
        return false;
      }
    } catch (err) {
      console.error("Validation error", err);
      v[idx] = { status: "invalid", message: "Error validating", loading: false };
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

  const searchUsers = async (term) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const baseURL = import.meta.env.VITE_API_URL;
      const url = `${baseURL}/api/users/search/users?q=${encodeURIComponent(term)}&verified=true`;
      
      console.log("Searching users at:", url);
      
      const res = await axios.get(url);
      
      setSearchResults(res.data || []);
      console.log("Search results:", res.data);
    } catch (err) {
      console.error("User search error:", err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
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
        message: res.data.restrictionMessage
      });

      if (res.data.invalidParticipants && res.data.invalidParticipants.length > 0) {
        const v = [...validation];
        
        res.data.invalidParticipants.forEach(invalid => {
          const index = formData.participants.findIndex(
            p => p.id_number === invalid.id_number
          );
          
          if (index !== -1) {
            v[index] = { 
              ...v[index],
              status: "invalid", 
              message: `No access to ${formData.location}`,
              loading: false 
            };
          }
        });
        
        setValidation(v);
      }
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
    // Check if main user is selected
    if (!formData.mainUserId) {
      setError("Please select a main user for this reservation.");
      return false;
    }

    // Check required fields
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

    // Check room availability
    const selectedRoom = rooms.find(room => room._id === formData.room_Id);
    if (selectedRoom && !selectedRoom.isActive) {
      setError("This room is currently unavailable. Please select another room.");
      return false;
    }

    // Check future date
    const now = new Date();
    const selectedDate = new Date(`${formData.date}T${formData.time}`);
    if (selectedDate < now) {
      setError("Cannot create reservation in the past.");
      return false;
    }

    // Check participant count
    const totalUsers = parseInt(formData.numUsers);
    if (formData.participants.length !== totalUsers) {
      setError(`Form error: Expected ${totalUsers} participants.`);
      return false;
    }

    // Check all participants are filled and validated
    const validParticipants = formData.participants
      .filter(p => p.id_number && p.id_number.trim())
      .length;

    if (validParticipants !== totalUsers) {
      setError(`Please add all ${totalUsers} participants with valid ID numbers.`);
      return false;
    }

    // Check validation status for all participants
    for (let i = 0; i < formData.participants.length; i++) {
      if (validation[i]?.status !== "valid") {
        const participant = formData.participants[i];
        const name = participant.name || `Participant ${i + 1}`;
        setError(`${name} is not verified. Please enter a valid ID number.`);
        return false;
      }
    }

    // Check floor access validation
    if (floorValidation && !floorValidation.valid) {
      setError("Some participants do not have access to the selected floor.");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError("");

    console.log("=".repeat(50));
    console.log("🔍 SUBMITTING RESERVATION");
    console.log("=".repeat(50));
    console.log("Main User ID:", formData.mainUserId);
    console.log("Main User Name:", formData.mainUserName);

    try {
      const manilaTime = moment.tz(
        `${formData.date}T${formData.time}`,
        "YYYY-MM-DDTHH:mm",
        "Asia/Manila"
      );

      const endManilaTime = manilaTime.clone().add(2, 'hours');

      const reservationData = {
        userId: formData.mainUserId, // Use the selected main user, not the admin
        room_Id: formData.room_Id,
        roomName: formData.roomName,
        location: formData.location,
        datetime: manilaTime.format(),
        date: formData.date,
        time: formData.time,
        endDatetime: endManilaTime.format(),
        numUsers: parseInt(formData.numUsers),
        purpose: formData.purpose,
        participants: formData.participants,
        status: "Approved",
        createdBy: "admin"
      };

      console.log("📦 Reservation data being sent:", JSON.stringify(reservationData, null, 2));
      console.log("API URL:", `${import.meta.env.VITE_API_URL}/api/reservations/admin-create`);

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/admin-create`,
        reservationData
      );
      
      console.log("✅ Reservation created successfully:", response.data);
      
      onSuccess?.();
      onClose();
    } catch (err) {
      console.error("❌ Reservation creation failed:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="bg-white p-6 border-b border-gray-200 sticky top-0 z-10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Calendar className="text-blue-600" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Create New Reservation</h2>
                <p className="text-sm text-gray-600">Create a reservation on behalf of users</p>
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

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0" />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Main User Selection */}
        <div className="p-6 border-b border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Main User (Reservation Owner) *
          </label>
          {formData.mainUserName ? (
            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User size={18} className="text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{formData.mainUserName}</p>
                  <p className="text-sm text-gray-600">ID: {formData.participants[0]?.id_number}</p>
                </div>
              </div>
              <button
                onClick={() => setShowMainUserSearch(true)}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowMainUserSearch(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center gap-2 hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <Plus size={20} className="text-gray-400" />
              <span className="text-gray-600">Select Main User</span>
            </button>
          )}
        </div>

        {/* Floor Validation Warning */}
        {floorValidation && !floorValidation.valid && floorValidation.invalidParticipants?.length > 0 && (
          <div className="mx-6 mt-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800 text-sm font-medium mb-2">
                ⚠️ Floor Access Restrictions
              </p>
              <p className="text-yellow-700 text-sm mb-2">{floorValidation.message}</p>
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
                <span className={formData.date ? "text-gray-900" : "text-gray-400"}>
                  {formData.date ? new Date(formData.date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  }) : "Select Date"}
                </span>
                <Calendar size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Time *</label>
              <button
                onClick={() => setShowTimeModal(true)}
                className="w-full p-3 border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50"
              >
                <span className={formData.time ? "text-gray-900" : "text-gray-400"}>
                  {formData.time ? formatDisplayTime(formData.time) : "Select Time"}
                </span>
                <Clock size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Number of Users */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Users *</label>
              <button
                onClick={() => setShowUsersModal(true)}
                className="w-full p-3 border border-gray-300 rounded-lg flex items-center justify-between hover:bg-gray-50"
              >
                <span className={formData.numUsers ? "text-gray-900" : "text-gray-400"}>
                  {formData.numUsers ? `${formData.numUsers} Users` : "Select Users"}
                </span>
                <Users size={18} className="text-gray-400" />
              </button>
            </div>

            {/* Purpose */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Purpose *</label>
              <input
                type="text"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                placeholder="Enter purpose"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Location Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Location *</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {roomLocations.map((loc) => (
                <button
                  key={loc}
                  onClick={() => setFormData({ ...formData, location: loc, roomName: "", room_Id: "" })}
                  className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    formData.location === loc
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <Home size={24} className={formData.location === loc ? "text-blue-600" : "text-gray-400"} />
                  <span className="font-medium text-sm">{loc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Room Selection */}
          {formData.location && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">Select Room *</label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms
                  .filter(room => room.floor === formData.location)
                  .map((room) => {
                    const roomImage = getRoomImage(room);
                    const isSelected = formData.room_Id === room._id;

                    return (
                      <button
                        key={room._id}
                        onClick={() => handleRoomSelect(room)}
                        disabled={!room.isActive}
                        className={`relative border-2 rounded-xl overflow-hidden transition-all ${
                          isSelected
                            ? "border-blue-500 ring-2 ring-blue-200"
                            : !room.isActive
                            ? "border-gray-200 opacity-60 cursor-not-allowed"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {roomImage && (
                          <img
                            src={roomImage}
                            alt={room.room}
                            className="w-full h-32 object-cover"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                          <h3 className="font-semibold">{room.room}</h3>
                          <p className="text-xs opacity-90">Capacity: {room.capacity}</p>
                          {room.features && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(room.features).map(([feature, enabled]) => 
                                enabled && (
                                  <span key={feature} className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                                    {feature}
                                  </span>
                                )
                              )}
                            </div>
                          )}
                        </div>
                        {!room.isActive && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs">
                            Unavailable
                          </div>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Participants Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Participants ({formData.participants.length})
              </label>
              <button
                onClick={() => {
                  setCurrentParticipantIndex(formData.participants.length);
                  setShowUserSearch(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                <Plus size={16} />
                Add Participant
              </button>
            </div>

            <div className="space-y-3">
              {formData.participants.map((participant, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">
                      Participant {idx + 1}
                      {idx === 0 && <span className="ml-2 text-xs text-blue-600">(Main User)</span>}
                    </h4>
                    {idx > 0 && (
                      <button
                        onClick={() => {
                          const updated = formData.participants.filter((_, i) => i !== idx);
                          const v = validation.filter((_, i) => i !== idx);
                          setFormData({ ...formData, participants: updated, numUsers: updated.length.toString() });
                          setValidation(v);
                        }}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* ID Number */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">ID Number *</label>
                      <div className="relative">
                        <input
                          type="text"
                          value={participant.id_number}
                          onChange={(e) => handleParticipantChange(idx, "id_number", e.target.value)}
                          placeholder="Enter ID"
                          disabled={idx === 0 && formData.mainUserId} // Disable main user ID field
                          className={`w-full p-2 border rounded-lg text-sm ${
                            validation[idx]?.status === "valid"
                              ? "border-green-500 bg-green-50"
                              : validation[idx]?.status === "invalid"
                              ? "border-red-500 bg-red-50"
                              : "border-gray-300"
                          } ${idx === 0 && formData.mainUserId ? "bg-gray-100" : ""}`}
                        />
                        {validation[idx]?.loading && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Name */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={participant.name}
                        onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                        placeholder="Auto-filled from ID"
                        disabled
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                      />
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Department</label>
                      <input
                        type="text"
                        value={participant.department}
                        onChange={(e) => handleParticipantChange(idx, "department", e.target.value)}
                        placeholder="Auto-filled from ID"
                        disabled
                        className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                      />
                    </div>

                    {/* Course (if student) */}
                    {(!participant.role || (participant.role !== "Faculty" && participant.role !== "Staff")) && (
                      <>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Course</label>
                          <input
                            type="text"
                            value={participant.course}
                            onChange={(e) => handleParticipantChange(idx, "course", e.target.value)}
                            placeholder="Auto-filled from ID"
                            disabled
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Year Level</label>
                          <input
                            type="text"
                            value={participant.year_level}
                            onChange={(e) => handleParticipantChange(idx, "year_level", e.target.value)}
                            placeholder="Auto-filled from ID"
                            disabled
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm bg-gray-100"
                          />
                        </div>
                      </>
                    )}

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
                    </div>
                  </div>

                  {/* Search Button - Only show for non-main users */}
                  {idx > 0 && validation[idx]?.status !== "valid" && (
                    <button
                      onClick={() => {
                        setCurrentParticipantIndex(idx);
                        setShowUserSearch(true);
                      }}
                      className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      <Search size={14} />
                      Search User
                    </button>
                  )}
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
              disabled={loading || !formData.mainUserId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Create Reservation
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
                          ? 'bg-blue-600 text-white'
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

      {/* Time Modal */}
      {showTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Select Time</h3>
            
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
                            ? 'bg-blue-600 text-white border-blue-600'
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
                            ? 'bg-blue-600 text-white border-blue-600'
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

      {/* Users Modal */}
      {showUsersModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">Number of Users</h3>
            <div className="space-y-2">
              {[4, 5, 6, 7, 8].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumUsersChange(num.toString())}
                  className={`w-full p-3 border rounded-lg ${
                    formData.numUsers === num.toString()
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {num} Users
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowUsersModal(false)}
              className="mt-4 w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* User Search Modal for Participants */}
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
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {searchResults.map(user => (
                <button
                  key={user._id}
                  onClick={() => handleSelectUser(user)}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={18} className="text-blue-600" />
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

              {searchTerm && searchResults.length === 0 && !searchLoading && (
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

      {/* Main User Search Modal */}
      {showMainUserSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Select Main User</h3>
            
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                value={mainUserSearchTerm}
                onChange={(e) => {
                  setMainUserSearchTerm(e.target.value);
                  searchMainUsers(e.target.value);
                }}
                placeholder="Search by name or ID..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {mainUserSearchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {mainUserSearchResults.map(user => (
                <button
                  key={user._id}
                  onClick={() => handleSelectMainUser(user)}
                  className="w-full p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User size={18} className="text-blue-600" />
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

              {mainUserSearchTerm && mainUserSearchResults.length === 0 && !mainUserSearchLoading && (
                <p className="text-center text-gray-500 py-4">No users found</p>
              )}
            </div>

            <button
              onClick={() => {
                setShowMainUserSearch(false);
                setMainUserSearchTerm("");
                setMainUserSearchResults([]);
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

export default AdminCreateReservationModal;