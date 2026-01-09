import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import socket from "../utils/socket";
import moment from "moment-timezone";

// Import shared room images configuration
import { availableRoomImages, getRoomImageById } from "../data/roomImages";

function ReserveRoom({ user, setView }) {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    date: "",
    time: "",
    numUsers: "4",
    purpose: "",
    location: "",
    roomName: "",
    room_Id: "",
    idNumber: "",
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showNotVerifiedWarning, setShowNotVerifiedWarning] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [rooms, setRooms] = useState([]);
  const [selectedRoomDetails, setSelectedRoomDetails] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Add state to track if submission is in progress
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user is from College of Law
  const isCollegeOfLawUser = () => {
    return user?.department === "COL";
  };

  // Check if user is a graduate student (Master's/Doctoral)
  const isGraduateStudent = () => {
    if (!user?.course) return false;
    
    const graduateKeywords = ["Master", "Doctor", "MBA", "MPA", "MAGC", "MARS", "MAED"];
    return graduateKeywords.some(keyword => user.course.includes(keyword));
  };

  // Check if user can reserve a specific floor
  const canReserveFloor = (floor) => {
    // Ground Floor - Only for Graduate students
    if (floor === "Ground Floor") {
      return isGraduateStudent();
    }
    
    // 2nd Floor - Only for COL students
    if (floor === "2nd Floor") {
      return isCollegeOfLawUser();
    }
    
    // 4th and 5th Floors - Available for all students
    if (floor === "4th Floor" || floor === "5th Floor") {
      return true;
    }
    
    return false;
  };

  // Calendar generation functions
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const generateCalendarDays = (month, year) => {
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
      const isSunday = dateObj.getDay() === 0; // 0 is Sunday
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
  };

  const [calendarDays, setCalendarDays] = useState(generateCalendarDays(currentMonth, currentYear));

  const groupedRooms = rooms.reduce((acc, room) => {
    if (!acc[room.floor]) acc[room.floor] = [];
    acc[room.floor].push(room);
    return acc;
  }, {});

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

useEffect(() => {
  const fetchRooms = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/rooms`);
      setRooms(res.data);
    } catch (err) {
      console.error("Failed to fetch rooms:", err);
    }
  };

  fetchRooms();

  // Listen for room updates via socket
  const handleRoomUpdate = (data) => {
    if (data.type === 'room_updated' || data.type === 'room_created' || data.type === 'room_deleted') {
      fetchRooms(); // Refresh rooms list
    }
  };

  socket.on('room_update', handleRoomUpdate);
  
  return () => {
    socket.off('room_update', handleRoomUpdate);
  };
}, []);

  useEffect(() => {
    setCalendarDays(generateCalendarDays(currentMonth, currentYear));
  }, [currentMonth, currentYear]);

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

  useEffect(() => {
    if (user) {
      const updated = [...formData.participants];
      updated[0] = {
        name: user.name || "",
        course: user.course || "",
        year_level: user.year_level || "",
        department: user.department || "",
        id_number: user.id_number || "",
        role: user.role || "",
      };

      const v = [...validation];
      v[0] = user.verified 
        ? { status: "valid", message: "Verified ✓", loading: false } 
        : { status: "invalid", message: "Not Verified", loading: false };

      setFormData(prev => ({ ...prev, participants: updated }));
      setValidation(v);
    }
  }, [user]);

  useEffect(() => {
    if (user && !user.verified) {
      setShowNotVerifiedWarning(true);
    }
  }, [user]);

  useEffect(() => {
    if (!user?._id) return;

    const handleVerification = (data) => {
      if (data?.message?.includes("verified")) {
        window.location.reload();
      }
    };

    socket.on("notification", handleVerification);
    return () => socket.off("notification", handleVerification);
  }, [user]);

  useEffect(() => {
    if (user?._id) {
      socket.emit("join", { userId: user._id });
    }
  }, [user]);

  // Show alert modal function
  const showAlert = (message) => {
    setAlertMessage(message);
    setShowAlertModal(true);
  };

  const handleParticipantChange = async (idx, field, val) => {
    if (idx === 0 && validation[0]?.status === "valid") return;

    const updated = [...formData.participants];
    updated[idx][field] = val;

    if (field === "id_number" && val.trim()) {
      const isDuplicate = formData.participants.some(
        (p, i) => i !== idx && p.id_number === val
      );

      const v = [...validation];

      if (isDuplicate) {
        v[idx] = { status: "invalid", message: "Duplicate ID Number", loading: false };
        setValidation(v);
        updated[idx].id_number = val;
        setFormData({ ...formData, participants: updated });
        return;
      }

      // Set loading state
      v[idx] = { ...v[idx], loading: true };
      setValidation(v);

      try {
      const res = await axios.get(
  `${import.meta.env.VITE_API_URL}/api/users/check-participant?id_number=${val}`
);

        if (!res.data.exists) {
          v[idx] = { status: "invalid", message: "Not registered", loading: false };
          updated[idx] = { ...updated[idx], name: "", course: "", year_level: "", department: "", id_number: val, role: "" };
        } else if (!res.data.verified) {
          v[idx] = { status: "invalid", message: "Not verified", loading: false };
          updated[idx] = { ...updated[idx], name: "", course: "", year_level: "", department: "", id_number: val, role: "" };
        } else {
          updated[idx] = {
            ...updated[idx],
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
        v[idx] = { status: "invalid", message: "Error validating", loading: false };
        setValidation(v);
      }
    } else {
      updated[idx][field] = val;
      setFormData({ ...formData, participants: updated });
    }
  };

const handleNumUsersChange = (val) => {
  const n = parseInt(val, 10);
  const updated = [...formData.participants];
  const v = [...validation];
  
  // ✅ FIXED: Create exactly n participants (including main reserver)
  while (updated.length < n) {
    updated.push({ name: "", course: "", year_level: "", department: "", id_number: "", role: "" });
    v.push({ status: null, message: "", loading: false });
  }

  // Trim to exactly n participants
  updated.length = n;
  v.length = n;
  
  // Auto-fill the first participant (main reserver) with user's data
  if (user && updated.length > 0) {
    updated[0] = {
      name: user.name || "",
      course: user.course || "",
      year_level: user.year_level || "",
      department: user.department || "",
      id_number: user.id_number || "",
      role: user.role || "",
    };
    
    v[0] = user.verified 
      ? { status: "valid", message: "Verified ✓", loading: false } 
      : { status: "invalid", message: "Not Verified", loading: false };
  }
  
  setFormData({ ...formData, numUsers: val, participants: updated });
  setValidation(v);
  setShowUsersModal(false);
};

  // ✅ FIXED: Enhanced floor access validation function
  const validateParticipantFloorAccess = async () => {
    try {
      console.log('🔍 Starting floor access validation...');
      
      // Filter out empty participant IDs and get only the IDs
      const participantIds = formData.participants
        .map(p => p.id_number)
        .filter(id => id && id.toString().trim() !== "" && id !== user.id_number); // Exclude main user

      console.log('📋 Validation data:', {
        location: formData.location,
        participantIds: participantIds,
        totalParticipants: formData.participants.length
      });

      // If no additional participants besides main user, validation passes
      if (participantIds.length === 0) {
        console.log('✅ No additional participants to validate');
        return true;
      }

      console.log('🔄 Sending validation request to server...');
const response = await axios.post(
  `${import.meta.env.VITE_API_URL}/api/reservations/validate-floor-access`, 
        {
          location: formData.location,
          participantIds: participantIds
        },
        {
          timeout: 10000, // 10 second timeout
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Floor access validation response:', response.data);

      if (!response.data.valid) {
        const invalidNames = response.data.invalidParticipants.map(p => p.name || p.identifier).join(', ');
        const errorMessage = `The following participants don't have access to ${formData.location}: ${invalidNames}\n\n${response.data.restrictionMessage}`;
        
        showAlert(errorMessage);
        return false;
      }
      
      console.log('✅ All participants have floor access');
      return true;
    } catch (error) {
      console.error("❌ Floor access validation error:", error);
      
      let errorMsg = "Error validating participant access. Please try again.";
      
      if (error.response) {
        // Server responded with error status
        console.error("Server response error:", error.response.data);
        errorMsg = error.response.data.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        // Request was made but no response received
        console.error("No response received:", error.request);
        errorMsg = "No response from server. Please check your connection.";
      } else {
        // Something else happened
        console.error("Error message:", error.message);
        errorMsg = error.message;
      }
      
      showAlert(`Floor access validation failed: ${errorMsg}`);
      return false;
    }
  };

const validateForm = () => {
  if (!formData.date || !formData.time || !formData.location || !formData.roomName || !formData.purpose) {
    showAlert("Please complete all required fields.");
    return false;
  }

  // Check if selected room is disabled
  const selectedRoom = rooms.find(room => room._id === formData.room_Id);
  if (selectedRoom && !selectedRoom.isActive) {
    showAlert("This room is currently unavailable. Please select another room.");
    return false;
  }

  // Check if selected date/time is in the past
  const now = new Date();
  const selectedDate = new Date(`${formData.date}T${formData.time}`);
  if (selectedDate < now) {
    showAlert("You cannot reserve a room in the past. Please select a future date and time.");
    return false;
  }

  // Check if user can reserve the selected floor
  if (!canReserveFloor(formData.location)) {
    if (formData.location === "Ground Floor") {
      showAlert("Ground Floor is reserved for Graduate students only.");
    } else if (formData.location === "2nd Floor") {
      showAlert("2nd Floor is reserved for College of Law students only.");
    } else {
      showAlert("You don't have access to this floor.");
    }
    return false;
  }

  // ✅ FIXED: The participants array now includes ALL users including main reserver
  const totalUsers = parseInt(formData.numUsers);
  
  // Debug log to see what's happening
  console.log('🔍 Form validation debug:', {
    selectedUsers: totalUsers,
    currentParticipants: formData.participants.length,
    participants: formData.participants
  });

  // Check if we have the exact number of participants for the selected group size
  // Now it should be totalUsers (not totalUsers - 1) because participants includes everyone
  if (formData.participants.length !== totalUsers) {
    showAlert(`Form error: Expected ${totalUsers} participants for ${totalUsers} users. Please refresh the page and try again.`);
    return false;
  }

  // ✅ FIXED: Count how many participants are actually filled (excluding main reserver)
const filledParticipants = formData.participants
  .filter((p, index) => index !== 0) // Exclude main reserver
  .filter(p => p.name && p.name.trim() && p.id_number && p.id_number.toString().trim())
  .length;

// ✅ FIXED: For the selected group size, we need (totalUsers - 1) additional participants
const expectedAdditionalParticipants = totalUsers - 1;

if (filledParticipants !== expectedAdditionalParticipants) {
  showAlert(`Please complete all ${expectedAdditionalParticipants} additional participant fields for ${totalUsers} total users.`);
  return false;
}

  // ✅ FIXED: Validate that ALL filled participants are verified and complete
  for (let i = 0; i < formData.participants.length; i++) {
    const p = formData.participants[i];
    
    // Check if all required fields are filled
    if (!p.name || !p.department || !p.id_number) {
      showAlert(`Please complete all fields for participant ${i + 1}.`);
      return false;
    }

    // For students, check course and year level (unless they are Faculty/Staff)
    if (p.role !== "Faculty" && p.role !== "Staff" && (!p.course || !p.year_level)) {
      showAlert(`Please complete course and year level for participant ${i + 1} (${p.name}).`);
      return false;
    }

    // Check verification status
    if (validation[i].status !== "valid") {
      showAlert(`Participant ${i + 1} (${p.name}) is not verified or registered.`);
      return false;
    }
  }

  return true;
};

  const submitReservation = async () => {
    // Prevent multiple clicks
    if (isSubmitting) {
      console.log("Submission already in progress, ignoring click");
      return;
    }

    // Set submitting state to true
    setIsSubmitting(true);
    
    if (!user.verified) {
      setShowNotVerifiedWarning(true);
      setIsSubmitting(false); // Reset submitting state
      return;
    }

    if (!validateForm()) {
      setIsSubmitting(false); // Reset submitting state
      return;
    }

    // ✅ FIXED: Enhanced floor access validation with better error handling
    console.log('🔄 Starting floor access validation before submission...');
    const allParticipantsHaveAccess = await validateParticipantFloorAccess();
    if (!allParticipantsHaveAccess) {
      console.log('❌ Floor access validation failed - stopping submission');
      setIsSubmitting(false); // Reset submitting state
      return; // Stop submission if participants don't have access
    }
    console.log('✅ All participants have floor access - proceeding with submission');

    try {
const check = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/check-limit/${user._id}`, {
        params: {
          date: formData.date,
          time: formData.time,
          asMain: true
        }
      });

      if (check.data.blocked) {
        showAlert(check.data.reason || "You have reached your reservation limit for this week.");
        setIsSubmitting(false); // Reset submitting state
        return;
      }
    } catch (err) {
      console.error("Limit check failed", err);
      const message = err.response?.data?.message || "Failed to verify reservation limit.";
      showAlert(message);
      setIsSubmitting(false); // Reset submitting state
      return;
    }

    setLoading(true);

    try {
      const manilaTime = moment.tz(
        `${formData.date}T${formData.time}`,
        "YYYY-MM-DDTHH:mm",
        "Asia/Manila"
      );

      const endManilaTime = manilaTime.clone().add(1, 'hour');


const reservationData = {
  userId: user._id,
  room_Id: formData.room_Id,
  roomName: formData.roomName,
  location: formData.location,
  datetime: manilaTime.format(),
  datetimeUTC: manilaTime.utc().format(),
  date: formData.date,
  time: formData.time,
  endDatetime: endManilaTime.format(),
  endDatetimeUTC: endManilaTime.utc().format(),
  numUsers: parseInt(formData.numUsers), // Total including main reserver
  purpose: formData.purpose,
  participants: formData.participants, // ✅ Send ALL participants including yourself
  timezone: "Asia/Manila",
  status: "Pending"
};

await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations`, reservationData);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Reservation failed:", error);
      showAlert(`Reservation failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
      setIsSubmitting(false); // Reset submitting state
    }
  };

  const closeSuccess = () => {
    setShowSuccessModal(false);
    navigate("/dashboard");
  };

  const roomLocations = [
    "Ground Floor",
    "2nd Floor", 
    "4th Floor", 
    "5th Floor"
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

  const formatDisplayTime = (timeValue) => {
    const slot = timeSlots.find(t => t.value === timeValue);
    return slot ? slot.display : "Select Time";
  };

const handleRoomSelect = (room) => {
  if (!room.isActive) {
    showAlert("This room is currently unavailable. Please select another room.");
    return;
  }
  
  setFormData((prev) => ({
    ...prev,
    roomName: room.room,
    room_Id: room._id,
  }));
  setSelectedRoomDetails(room); // ✅ This passes the full room object with image data
};

// ✅ FIXED: Enhanced getRoomImage function in ReserveRoom.jsx
const getRoomImage = (room) => {
  // ✅ FIRST: Use the image from database if available
  if (room.image && room.image.url) {
    return room.image.url;
  }

  // ✅ SECOND: Fallback to direct mappings
  const directMappings = {
    // Discussion Rooms
    "Discussion Room 1": "discussion_room_1",
    "Discussion Room 2": "discussion_room_2",
    "Discussion Room 3": "discussion_room_3",
    
    // Graduate Research Hubs
    "Graduate Research Hub 1": "graduate_hub_1",
    "Graduate Research Hub 2": "graduate_hub_2", 
    "Graduate Research Hub 3": "graduate_hub_3",
    
    // 2nd Floor Rooms
    "2nd Floor Discussion Room 1": "2nd_discussion_room_1_2",
    "2nd Floor Discussion Room 2": "2nd_discussion_room_2_2",
    "2nd Floor Faculty Room": "2nd_faculty_room_1_2",
    
    // 5th Floor Rooms
    "Faculty Room": "faculty_room",
    "Collaboration Room": "collab_room",
  };

  const imageId = directMappings[room.room];
  if (imageId) {
    const image = getRoomImageById(imageId);
    if (image?.url) {
      return image.url;
    }
  }

  // ✅ THIRD: Final fallback to floor images
  if (room.floor === "Ground Floor") return getRoomImageById("ground_floor")?.url;
  if (room.floor === "2nd Floor") return getRoomImageById("second_floor_1")?.url;
  return getRoomImageById("fifth_floor")?.url;
};

  const RoomFeatureIcon = ({ feature, enabled }) => {
    const icons = {
      wifi: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
        </svg>
      ),
      aircon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      projector: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      ),
      monitor: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    };

    return (
      <span 
        className={`text-xs px-2 py-1 rounded-full flex items-center justify-center gap-1 ${
          enabled 
            ? "bg-blue-100 text-blue-700 border border-blue-200" 
            : "bg-gray-100 text-gray-400 border border-gray-200"
        }`}
        title={feature}
      >
        {icons[feature] || feature}
        <span className="capitalize">{feature}</span>
      </span>
    );
  };

const getFloorImage = (floor) => {
  const floorImageMap = {
    "Ground Floor": getRoomImageById("ground_floor")?.url,
    "2nd Floor": getRoomImageById("second_floor_1")?.url, // Use actual 2nd floor image
    "4th Floor": getRoomImageById("fifth_floor")?.url, // You'll need to add 4th floor images
    "5th Floor": getRoomImageById("fifth_floor")?.url,
  };
  
  return floorImageMap[floor] || getRoomImageById("ground_floor")?.url;
};

// Mobile Participant Card Component - FIXED: Completely rewritten to fix keyboard issue
const MobileParticipantCard = React.memo(({ participant, index, validation }) => {
  const inputRef = useRef(null);
  const [lastValue, setLastValue] = useState(participant.id_number);
  
  // This effect ensures the input stays focused on mobile
  useEffect(() => {
    if (inputRef.current && document.activeElement !== inputRef.current) {
      // If the value changed but we're not focused, refocus
      if (participant.id_number !== lastValue && participant.id_number !== "") {
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            // Move cursor to end
            inputRef.current.setSelectionRange(
              inputRef.current.value.length,
              inputRef.current.value.length
            );
          }
        }, 10);
      }
      setLastValue(participant.id_number);
    }
  }, [participant.id_number, lastValue]);

  const handleIdChange = (e) => {
    const value = e.target.value;
    handleParticipantChange(index, "id_number", value);
    
    // Keep focus on mobile
    if (isMobile && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus();
          // Move cursor to end
          inputRef.current.setSelectionRange(
            inputRef.current.value.length,
            inputRef.current.value.length
          );
        }
      }, 50);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4">
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-semibold text-gray-800">Participant {index + 1}</h3>
        {index === 0 && (
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
            Main Reserver
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* ID Number - FIXED: Using type="tel" and better focus management */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">ID Number</label>
          <div className="relative">
            <input
              ref={inputRef}
              type="tel" // Use tel for numeric keyboard on mobile
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="Enter ID Number"
              className={`w-full p-3 rounded-lg outline-none border shadow-sm transition-colors text-sm
                ${
                  validation?.status === "valid"
                    ? "border-green-500 bg-green-50"
                    : validation?.status === "invalid"
                    ? "border-red-500 bg-red-50"
                    : "border-gray-300 focus:border-[#CC0000]"
                }`}
              value={participant.id_number}
              disabled={index === 0}
              onChange={handleIdChange}
              onFocus={(e) => {
                // Ensure cursor at end when focused
                setTimeout(() => {
                  e.target.setSelectionRange(
                    e.target.value.length,
                    e.target.value.length
                  );
                }, 0);
              }}
              onBlur={(e) => {
                // Only process blur if user intentionally blurred
                if (!e.relatedTarget || !e.relatedTarget.closest('.MobileParticipantCard')) {
                  // Normal blur handling
                }
              }}
              onTouchEnd={(e) => {
                // On mobile touch, ensure focus stays
                e.preventDefault();
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
            />
            {validation?.loading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg className="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z"></path>
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-sm"
            value={participant.name}
            disabled={index === 0 || validation.status === "valid"}
            onChange={(e) =>
              handleParticipantChange(index, "name", e.target.value)
            }
          />
        </div>

        {/* Course and Year Level - Conditionally Rendered */}
        {(!participant.role || (participant.role !== "Faculty" && participant.role !== "Staff")) && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                <input
                  type="text"
                  placeholder="Course"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-sm"
                  value={participant.course}
                  disabled={index === 0 || validation.status === "valid"}
                  onChange={(e) =>
                    handleParticipantChange(index, "course", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Year Level</label>
                <input
                  type="text"
                  placeholder="Year Level"
                  className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-sm"
                  value={participant.year_level}
                  disabled={index === 0 || validation.status === "valid"}
                  onChange={(e) =>
                    handleParticipantChange(index, "year_level", e.target.value)
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* Department */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
          <input
            type="text"
            placeholder="Department"
            className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-sm"
            value={participant.department}
            disabled={index === 0 || validation.status === "valid"}
            onChange={(e) =>
              handleParticipantChange(index, "department", e.target.value)
            }
          />
        </div>

        {/* Status */}
        <div className="pt-2 border-t border-gray-100">
          {validation?.status === "valid" && (
            <span className="text-green-600 text-sm font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Verified
            </span>
          )}
          {validation?.status === "invalid" && (
            <span className="text-red-600 text-sm font-medium flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {validation?.message}
            </span>
          )}
          {!validation?.status && participant.id_number && (
            <span className="text-gray-500 text-sm">Enter ID to verify</span>
          )}
        </div>
      </div>
    </div>
  );
});

MobileParticipantCard.displayName = 'MobileParticipantCard';

  return (
    <main className="w-full md:ml-[250px] md:w-[calc(100%-250px)] flex flex-col bg-gray-50 min-h-screen">
      {loading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <svg
            className="animate-spin h-16 w-16 text-white mb-4"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z"
            ></path>
          </svg>
          <p className="text-white text-lg">Submitting Reservation...</p>
        </div>
      )}

      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">Room Reservation Request</h1>
        <button 
          onClick={() => setView("dashboard")}
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 flex items-center cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </button>
      </header>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* User Type Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-blue-800 font-medium text-sm">
              {isCollegeOfLawUser() 
                ? "College of Law Access: You can reserve 2nd Floor rooms and all general floors."
                : isGraduateStudent()
                ? "Graduate Student Access: You can reserve Ground Floor rooms and all general floors."
                : "Regular Student Access: You can reserve rooms on the 4th and 5th floors only."}
            </p>
          </div>
        </div>

        {/* Form Controls */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Reservation Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {/* Date Selector */}
            <div className="space-y-1">
              <p className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Select Date
              </p>
              <div
                onClick={() => setShowDateModal(true)}
                className="w-full p-2 sm:p-3 border rounded-lg border-gray-300 shadow-sm outline-none focus:border-[#CC0000] flex items-center cursor-pointer hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                {formData.date ? (
                  new Date(formData.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })
                ) : (
                  <span className="text-gray-400 font-semibold">Select Date</span>
                )}
              </div>
            </div>

            {/* Time Selector */}
            <div className="space-y-1">
              <p className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time
              </p>
              <div
                onClick={() => setShowTimeModal(true)}
                className="w-full p-2 sm:p-3 border rounded-lg border-gray-300 shadow-sm outline-none focus:border-[#CC0000] flex items-center cursor-pointer hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                {formData.time ? formatDisplayTime(formData.time) : <span className="text-gray-400 font-semibold">Select Time</span>}
              </div>
            </div>

            {/* Number of Users Selector */}
            <div className="space-y-1">
              <p className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Number of Users
              </p>
              <div
                onClick={() => setShowUsersModal(true)}
                className="w-full p-2 sm:p-3 border rounded-lg border-gray-300 shadow-sm outline-none focus:border-[#CC0000] flex items-center cursor-pointer hover:bg-gray-50 transition-colors text-sm sm:text-base"
              >
                {formData.numUsers ? `${formData.numUsers} Users` : <span className="text-gray-400">Select Users</span>}
              </div>
            </div>
          </div>

          {/* Purpose */}
          <div className="mt-3 sm:mt-4">
            <p className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Purpose
            </p>
            <input
              className="w-full p-2 sm:p-3 mt-1 border rounded-lg border-gray-300 shadow-sm outline-none focus:border-[#CC0000] text-sm sm:text-base font-semibold"
              type="text"
              value={formData.purpose}
              onChange={(e) =>
                setFormData({ ...formData, purpose: e.target.value })
              }
              placeholder="Enter purpose of reservation"
            />
          </div>
        </div>

        {/* Date Selection Modal */}
        {showDateModal && (
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[400px] shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={() => handleMonthChange(-1)}
                  className="p-2 rounded-full hover:bg-gray-100 font-bold cursor-pointer transition-colors"
                >
                  &lt;
                </button>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {months[currentMonth]} {currentYear}
                </h2>
                <button 
                  onClick={() => handleMonthChange(1)}
                  className="p-2 rounded-full hover:bg-gray-100 font-bold cursor-pointer transition-colors"
                >
                  &gt;
                </button>
              </div>
              
              <div className="grid grid-cols-7 gap-2 mb-4">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className={`text-center font-medium text-sm sm:text-base ${
                    day === 'Su' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {day}
                  </div>
                ))}
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                {calendarDays.map((day, index) => (
                  <div key={index} className="text-center">
                    {day ? (
                      <button
                        onClick={() => {
                          if (!day.disabled) {
                            setFormData({ ...formData, date: day.date });
                            setShowDateModal(false);
                          }
                        }}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors text-base font-medium
                          ${day.disabled ? 
                            day.isSunday ? 
                              'text-red-300 bg-red-50 cursor-not-allowed' : 
                              'text-gray-300 cursor-not-allowed' : 
                            formData.date === day.date ? 
                              'bg-[#CC0000] text-white' : 
                              day.isSunday ?
                                'text-red-500 hover:bg-red-50' :
                                'hover:bg-gray-100'
                          }`}
                        disabled={day.disabled}
                      >
                        {day.day}
                      </button>
                    ) : (
                      <div className="w-12 h-12"></div>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowDateModal(false)}
                className="mt-4 bg-[#CC0000] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition w-full cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Time Selection Modal */}
        {showTimeModal && (
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[600px] max-h-[90vh] overflow-y-auto shadow-xl">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select Time
              </h2>

              <div className="flex flex-col md:flex-row gap-4 sm:gap-6">
                {/* Morning */}
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-500 mb-2">
                    Morning (7:00 AM – 11:30 AM)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-1 font-bold gap-2">
                    {timeSlots
                      .filter((slot) => {
                        const [hourStr] = slot.value.split(":");
                        const hour = parseInt(hourStr, 10);
                        return hour >= 7 && hour < 12;
                      })
                      .map((slot) => (
                        <button
                          key={slot.value}
                          onClick={() => {
                            setFormData({ ...formData, time: slot.value });
                            setShowTimeModal(false);
                          }}
                          className={`p-2 sm:p-3 border border-gray-300 rounded-lg text-center cursor-pointer transition-colors text-sm sm:text-base ${
                            formData.time === slot.value
                              ? "bg-[#CC0000] text-white border-[#CC0000]"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {slot.display}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Afternoon */}
                <div className="flex-1">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-500 mb-2">
                    Afternoon (1:00 PM – 5:00 PM)
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-1 font-bold gap-2">
                    {timeSlots
                      .filter((slot) => {
                        const [hourStr] = slot.value.split(":");
                        const hour = parseInt(hourStr, 10);
                        return hour >= 13 && hour <= 17;
                      })
                      .map((slot) => (
                        <button
                          key={slot.value}
                          onClick={() => {
                            setFormData({ ...formData, time: slot.value });
                            setShowTimeModal(false);
                          }}
                          className={`p-2 sm:p-3 border border-gray-300 rounded-lg text-center cursor-pointer transition-colors text-sm sm:text-base ${
                            formData.time === slot.value
                              ? "bg-[#CC0000] text-white border-[#CC0000]"
                              : "hover:bg-gray-100"
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
                className="mt-4 bg-[#CC0000] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition w-full cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Number of Users Modal */}
        {showUsersModal && (
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[350px] shadow-xl">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Number of Users
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:gap-3 font-bold mb-4 ">
                {[4, 5, 6, 7, 8].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      handleNumUsersChange(num.toString());
                      setShowUsersModal(false);
                    }}
                    className={`p-3 sm:p-4 border border-gray-300 rounded-lg text-center cursor-pointer transition-colors text-sm sm:text-base  ${
                      formData.numUsers === num.toString()
                        ? "bg-[#CC0000] text-white border-[#CC0000]"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    {num} Users
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowUsersModal(false)}
                className="mt-4 bg-[#CC0000] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition w-full cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Room Location */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Room Location</h2>
          <div className="flex flex-wrap gap-3 sm:gap-5 justify-center">
            {roomLocations.map((loc) => {
              const imageSrc = getFloorImage(loc);
              const canReserve = canReserveFloor(loc);

              return (
                <div
                  key={loc}
                  onClick={() => {
                    if (!canReserve) {
                      if (loc === "Ground Floor") {
                        showAlert("Ground Floor is reserved for Graduate students only.");
                      } else if (loc === "2nd Floor") {
                        showAlert("2nd Floor is reserved for College of Law students only.");
                      } else {
                        showAlert("You don't have access to this floor.");
                      }
                      return;
                    }
                    setFormData({
                      ...formData,
                      location: loc,
                      roomName: "",
                      room_Id: "",
                    });
                  }}
                  className={`border-2 rounded-2xl w-full xs:w-[150px] sm:w-[180px] md:w-[200px] h-[120px] sm:h-[150px] md:h-[200px] flex flex-col justify-center items-center cursor-pointer transition-all duration-200 overflow-hidden relative ${
                    formData.location === loc 
                      ? "border-[#CC0000] ring-2 ring-red-100 opacity-100 scale-105" 
                      : !canReserve
                      ? "border-gray-200 opacity-50 cursor-not-allowed"
                      : "border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300"
                  }`}
                >
                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt={loc}
                      className="absolute w-full h-full object-cover"
                      loading="lazy"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40"></div>
                  
                  {/* Restricted Badge */}
                  {!canReserve && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                      Restricted
                    </div>
                  )}
                  
                  <div className="relative z-10 text-white text-center px-2 drop-shadow-md">
                    <p className="text-sm sm:text-base md:text-lg font-semibold mb-1">
                      {loc}
                    </p>
                    {(loc === "Ground Floor" || loc === "2nd Floor") && (
                      <p className="text-xs sm:text-sm opacity-90">
                        {loc === "Ground Floor" ? "Graduate Studies & Periodicals" : "Law Library"}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Room Selection */}
        {formData.location && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Select Room</h2>

            <div className="flex flex-wrap gap-3 sm:gap-5 justify-center">
              {rooms
                .filter((room) => {
                  const floor = formData.location;

                  if (floor === "5th Floor") {
                    return (
                      room.floor === floor &&
                      (room.room === "Faculty Room" ||
                        room.room === "Collaboration Room")
                    );
                  } else {
                    return room.floor === floor;
                  }
                })
                .map((room) => {
                  const roomImage = getRoomImage(room);
                  const isDisabled = !room.isActive;
                  const canReserve = canReserveFloor(room.floor);

                  return (
                    <div
                      key={room._id}
                      onClick={() => {
                        if (!canReserve) {
                          if (room.floor === "Ground Floor") {
                            showAlert("Ground Floor is reserved for Graduate students only.");
                          } else if (room.floor === "2nd Floor") {
                            showAlert("2nd Floor is reserved for College of Law students only.");
                          } else {
                            showAlert("You don't have access to this floor.");
                          }
                          return;
                        }
                        if (!isDisabled) {
                          handleRoomSelect(room);
                        }
                      }}
                      className={`border-2 rounded-2xl w-full sm:w-[280px] md:w-[300px] h-[250px] sm:h-[280px] md:h-[300px] flex justify-center items-center cursor-pointer relative overflow-hidden transition-all duration-200 ${
                        formData.room_Id === room._id
                          ? "border-[#CC0000] ring-2 ring-red-100 bg-red-50"
                          : isDisabled
                          ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-60"
                          : !canReserve
                          ? "border-gray-300 bg-gray-100 cursor-not-allowed opacity-60"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {roomImage && (
                        <img
                          src={roomImage}
                          alt={room.room}
                          className="absolute w-full h-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className={`absolute inset-0 z-0 ${
                        isDisabled || !canReserve ? "bg-gray-800/60" : "bg-black/30"
                      }`}></div>
                      
                      {/* Room Status Badge */}
                      {isDisabled && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                          Unavailable
                        </div>
                      )}
                      
                      {/* Restricted Badge */}
                      {!canReserve && !isDisabled && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                          Restricted
                        </div>
                      )}
                      
                      <div className="relative z-10 text-center text-white p-3 sm:p-4">
                        <p className="text-lg sm:text-xl font-semibold drop-shadow-md mb-2">
                          {room.room}
                        </p>
                        
                        {/* Room Features */}
                        {room.features && Object.values(room.features).some(val => val) && (
                          <div className="flex flex-wrap justify-center gap-1 mb-2">
                            {Object.entries(room.features).map(([feature, enabled]) => 
                              enabled && (
                                <RoomFeatureIcon key={feature} feature={feature} enabled={enabled} />
                              )
                            )}
                          </div>
                        )}
                        
                        {/* Capacity */}
                        <div className="flex items-center justify-center text-xs sm:text-sm mb-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                          Capacity: {room.capacity}
                        </div>
                        
                        {/* Room Type */}
                        <div className="text-xs sm:text-sm opacity-90">
                          {room.type}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Selected Room Details */}
        {selectedRoomDetails && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Selected Room Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-2">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800">{selectedRoomDetails.room}</h3>
                    <p className="text-gray-600 text-sm sm:text-base">{selectedRoomDetails.floor} • {selectedRoomDetails.type}</p>
                  </div>
                  <span className={`px-2 py-1 sm:px-3 sm:py-1 rounded-full text-xs sm:text-sm font-medium self-start ${
                    selectedRoomDetails.isActive 
                      ? "bg-green-100 text-green-800 border border-green-200" 
                      : "bg-red-100 text-red-800 border border-red-200"
                  }`}>
                    {selectedRoomDetails.isActive ? "Available" : "Unavailable"}
                  </span>
                </div>

                {/* Room Features */}
                {selectedRoomDetails.features && Object.values(selectedRoomDetails.features).some(val => val) && (
                  <div className="mb-3 sm:mb-4">
                    <h4 className="font-semibold text-gray-700 mb-2 text-sm sm:text-base">Room Features:</h4>
                    <div className="flex flex-wrap gap-1 sm:gap-2">
                      {Object.entries(selectedRoomDetails.features).map(([feature, enabled]) => (
                        <div
                          key={feature}
                          className={`flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-lg border text-xs sm:text-sm ${
                            enabled 
                              ? "bg-blue-50 border-blue-200 text-blue-700" 
                              : "bg-gray-50 border-gray-200 text-gray-400"
                          }`}
                        >
                          <RoomFeatureIcon feature={feature} enabled={enabled} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Room Notes */}
                {selectedRoomDetails.notes && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                    <h4 className="font-semibold text-yellow-800 mb-1 sm:mb-2 flex items-center text-sm sm:text-base">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Important Notes:
                    </h4>
                    <p className="text-yellow-700 text-xs sm:text-sm">{selectedRoomDetails.notes}</p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-gray-700 mb-2 sm:mb-3 text-sm sm:text-base">Room Specifications</h4>
                <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-medium">{selectedRoomDetails.capacity} people</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Floor:</span>
                    <span className="font-medium">{selectedRoomDetails.floor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium">{selectedRoomDetails.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      selectedRoomDetails.isActive ? "text-green-600" : "text-red-600"
                    }`}>
                      {selectedRoomDetails.isActive ? "Available" : "Unavailable"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Participants - Responsive Design */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">
            Participants ({formData.participants.length})
          </h2>
          
          {/* Mobile View - Card Layout */}
          {isMobile ? (
            <div className="space-y-4">
              {formData.participants.map((participant, index) => (
                <MobileParticipantCard
                  key={index}
                  participant={participant}
                  index={index}
                  validation={validation[index]}
                />
              ))}
            </div>
          ) : (
            /* Desktop View - Table Layout */
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-[#FFCC00]">
                  <tr>
                    <th className="py-2 px-2 sm:py-3 sm:px-4 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">ID Number</th>
                    <th className="py-2 px-2 sm:py-3 sm:px-4 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Name</th>
                    <th className="py-2 px-2 sm:py-3 sm:px-4 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Course</th>
                    <th className="py-2 px-2 sm:py-3 sm:px-4 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Year Level</th>
                    <th className="py-2 px-2 sm:py-3 sm:px-4 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Department</th>
                    <th className="py-2 px-2 sm:py-3 sm:px-4 text-left text-xs font-medium text-gray-800 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {formData.participants.map((p, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100"}>
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="ID Number"
                            className={`w-full p-1 sm:p-2 pr-8 sm:pr-10 rounded-lg outline-none border shadow-sm transition-colors text-xs sm:text-sm
                              ${
                                validation[idx]?.status === "valid"
                                  ? "border-green-500 bg-green-50"
                                  : validation[idx]?.status === "invalid"
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-300 focus:border-[#CC0000]"
                              }`}
                            value={p.id_number}
                            disabled={idx === 0}
                            onChange={(e) =>
                              handleParticipantChange(idx, "id_number", e.target.value)
                            }
                          />
                          {validation[idx]?.loading && (
                            <div className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2">
                              <svg className="animate-spin h-3 w-3 sm:h-4 sm:w-4 text-gray-500" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z"></path>
                              </svg>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        <input
                          type="text"
                          placeholder="Full Name"
                          className="w-full p-1 sm:p-2 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-xs sm:text-sm"
                          value={p.name}
                          disabled={idx === 0 || validation[idx].status === "valid"}
                          onChange={(e) =>
                            handleParticipantChange(idx, "name", e.target.value)
                          }
                        />
                      </td>
                      {!p.role || (p.role !== "Faculty" && p.role !== "Staff") ? (
                        <td className="py-2 px-2 sm:py-3 sm:px-4">
                          <input
                            type="text"
                            placeholder="Course"
                            className="w-full p-1 sm:p-2 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-xs sm:text-sm"
                            value={p.course}
                            disabled={idx === 0 || validation[idx].status === "valid"}
                            onChange={(e) =>
                              handleParticipantChange(idx, "course", e.target.value)
                            }
                          />
                        </td>
                      ) : (
                        <td className="py-2 px-2 sm:py-3 sm:px-4 text-gray-400 italic text-xs sm:text-sm">N/A</td>
                      )}
                      {!p.role || (p.role !== "Faculty" && p.role !== "Staff") ? (
                        <td className="py-2 px-2 sm:py-3 sm:px-4">
                          <input
                            type="text"
                            placeholder="Year Level"
                            className="w-full p-1 sm:p-2 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-xs sm:text-sm"
                            value={p.year_level}
                            disabled={idx === 0 || validation[idx].status === "valid"}
                            onChange={(e) =>
                              handleParticipantChange(idx, "year_level", e.target.value)
                            }
                          />
                        </td>
                      ) : (
                        <td className="py-2 px-2 sm:py-3 sm:px-4 text-gray-400 italic text-xs sm:text-sm">N/A</td>
                      )}
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        <input
                          type="text"
                          placeholder="Department"
                          className="w-full p-1 sm:p-2 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-xs sm:text-sm"
                          value={p.department}
                          disabled={idx === 0 || validation[idx].status === "valid"}
                          onChange={(e) =>
                            handleParticipantChange(idx, "department", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        {validation[idx]?.status === "valid" && (
                          <span className="text-green-600 text-xs sm:text-sm font-medium flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        )}
                        {validation[idx]?.status === "invalid" && (
                          <span className="text-red-600 text-xs sm:text-sm font-medium flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            {validation[idx]?.message}
                          </span>
                        )}
                        {!validation[idx]?.status && p.id_number && (
                          <span className="text-gray-500 text-xs">Enter ID to verify</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          <p className="text-xs sm:text-sm text-gray-600 italic mt-2 sm:mt-3">
            * Enter ID Number to auto-fill participant details. Verified fields will be locked.
          </p>
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Important Notes</h2>
          <ul className="space-y-1 sm:space-y-2">
            <li className="text-xs sm:text-sm text-gray-600 flex items-start">
              <span className="text-red-600 font-bold mr-1">•</span>
              The group will be notified fifteen (15) minutes before the usage is terminated. If there are no standing reservations for the next hour, the group may request a one-hour extension.
            </li>
            <li className="text-xs sm:text-sm text-gray-600 flex items-start">
              <span className="text-red-600 font-bold mr-1">•</span>
              The Learning Resource Center reserves the right to cancel the reservation of any group that does not arrive within fifteen (15) minutes of the scheduled reservation time.
            </li>
          </ul>
        </div>

        {/* Submit Button - Fixed to prevent multiple clicks */}
        <div className="flex justify-center">
          <button
            onClick={submitReservation}
            type="button"
            disabled={loading || (selectedRoomDetails && !selectedRoomDetails.isActive) || isSubmitting}
            className={`px-6 sm:px-8 py-2 sm:py-3 rounded-lg transition cursor-pointer flex items-center text-sm sm:text-base ${
              loading || (selectedRoomDetails && !selectedRoomDetails.isActive) || isSubmitting
                ? "bg-gray-400 text-gray-200 cursor-not-allowed" 
                : "bg-[#CC0000] text-white hover:bg-red-700 hover:shadow-md"
            }`}
          >
            {loading || isSubmitting ? (
              <>
                <svg
                  className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-2"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16 8 8 0 01-8-8z"
                  ></path>
                </svg>
                Submitting...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {selectedRoomDetails && !selectedRoomDetails.isActive ? "Room Unavailable" : "Submit Reservation"}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[350px] text-center shadow-xl">
            <svg
              className="w-12 h-12 sm:w-16 sm:h-16 text-green-600 mx-auto mb-3 sm:mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              ></path>
            </svg>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Success!</h2>
            <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
              Your reservation request has been submitted successfully.
            </p>
            <button
              onClick={closeSuccess}
              className="bg-[#CC0000] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition w-full cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Not Verified Warning Modal */}
      {showNotVerifiedWarning && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[350px] text-center shadow-xl">
            <svg
              className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-500 mx-auto mb-3 sm:mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Account Not Verified</h2>
            <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base">
              Your account is not yet verified. You can still fill out the form,
              but you won't be able to submit a reservation until your account
              is verified.
            </p>
            <button
              onClick={() => setShowNotVerifiedWarning(false)}
              className="bg-[#CC0000] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition w-full cursor-pointer"
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {/* Alert Modal */}
      {showAlertModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[400px] text-center shadow-xl">
            <svg
              className="w-12 h-12 sm:w-16 sm:h-16 text-red-600 mx-auto mb-3 sm:mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              ></path>
            </svg>
            <h2 className="text-lg sm:text-xl font-semibold mb-2">Attention Needed</h2>
            <p className="text-gray-600 mb-3 sm:mb-4 text-sm sm:text-base whitespace-pre-line">
              {alertMessage}
            </p>
            <button
              onClick={() => setShowAlertModal(false)}
              className="bg-[#CC0000] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition w-full cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

export default ReserveRoom;