// src/ReserveRoom.jsx - COMPLETE with closure popup modal and header warnings
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import socket from "../utils/socket";
import moment from "moment-timezone";
import RoomAvailabilityModal from "./RoomAvailabilityModal";
import { AlertTriangle, Calendar, Clock, X, Building2, Info } from "lucide-react";

// Import shared room images configuration
import { availableRoomImages, getRoomImageById } from "../data/roomImages";

// Custom debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

function ReserveRoom({ user, setView }) {
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
  
  // Time picker state
  const [tempHour, setTempHour] = useState("7");
  const [tempMinute, setTempMinute] = useState("00");
  
  // Add state for room availability
  const [roomAvailability, setRoomAvailability] = useState([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [selectedAvailabilityDate, setSelectedAvailabilityDate] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState(null);
  
  // Alert modal state
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");

  // Add state to track if submission is in progress
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add refs for scrolling to invalid fields
  const dateRef = useRef(null);
  const timeRef = useRef(null);
  const locationRef = useRef(null);
  const roomRef = useRef(null);
  const purposeRef = useRef(null);
  const participantRefs = useRef([]);

  // ========== FLOOR-BASED CLOSURE SYSTEM ==========
  const [closures, setClosures] = useState([]);
  const [closureLoading, setClosureLoading] = useState(false);
  const [showClosureModal, setShowClosureModal] = useState(false);
  const [showClosureListModal, setShowClosureListModal] = useState(false);
  const [activeClosuresList, setActiveClosuresList] = useState([]);
  const [selectedClosure, setSelectedClosure] = useState(null);
  const [globalClosure, setGlobalClosure] = useState(null);
  // Track which floors are fully closed
  const [closedFloors, setClosedFloors] = useState([]);
  // Track floor-specific closure info
  const [floorClosures, setFloorClosures] = useState({});
  // Track if current selected time is within any closure
  const [isCurrentTimeClosed, setIsCurrentTimeClosed] = useState(false);
  const [currentTimeClosures, setCurrentTimeClosures] = useState([]);

  // Fetch closures for selected date
  const fetchClosuresForDate = useCallback(async (date) => {
    if (!date) return;
    
    setClosureLoading(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/closures`, {
        params: {
          date: date,
          status: "Active"
        }
      });
      
      // Filter active closures for this date
      const activeClosures = (response.data.closures || []).filter(
        closure => closure.status === "Active" && closure.date === date
      );
      
      console.log("Active closures for date:", activeClosures);
      
      setClosures(activeClosures);
      setActiveClosuresList(activeClosures);
      
      // Check for global closure (affects all floors)
      const global = activeClosures.find(c => c.affectedAllFloors === true);
      setGlobalClosure(global);
      
      // Determine which floors are closed
      const closedFloorsSet = new Set();
      const floorClosuresMap = {};
      
      activeClosures.forEach(closure => {
        if (closure.affectedAllFloors) {
          // If global closure, all floors are closed
          const allFloors = ["Ground Floor", "2nd Floor", "4th Floor", "5th Floor"];
          allFloors.forEach(floor => {
            closedFloorsSet.add(floor);
            if (!floorClosuresMap[floor]) floorClosuresMap[floor] = [];
            floorClosuresMap[floor].push(closure);
          });
        } else if (closure.affectedFloors && closure.affectedFloors.length > 0) {
          // Floor-specific closure
          closure.affectedFloors.forEach(floor => {
            closedFloorsSet.add(floor);
            if (!floorClosuresMap[floor]) floorClosuresMap[floor] = [];
            floorClosuresMap[floor].push(closure);
          });
        }
      });
      
      setClosedFloors(Array.from(closedFloorsSet));
      setFloorClosures(floorClosuresMap);
      
      // SHOW CLOSURE LIST MODAL if there are closures
      if (activeClosures.length > 0 && !showClosureListModal) {
        setShowClosureListModal(true);
      }
      
      // Show alert for global closure
      if (global) {
        showAlert(
          `⚠️ FACILITY CLOSURE NOTICE\n\n${global.title}\n${global.reason || ""}\n\nTime: ${global.startTime} - ${global.endTime}\n\nAll facilities are CLOSED during this time. No reservations can be made.`,
          8000
        );
      } else if (closedFloorsSet.size > 0) {
        // Show alert for floor closures
        const closedFloorsList = Array.from(closedFloorsSet).join(", ");
        showAlert(
          `⚠️ FLOOR CLOSURE NOTICE\n\nThe following floors have active closures: ${closedFloorsList}\n\nPlease select a different floor or time.\n\nReservations cannot be made on closed floors.`,
          6000
        );
      }
    } catch (error) {
      console.error("Error fetching closures:", error);
    } finally {
      setClosureLoading(false);
    }
  }, []);

  // Check if a specific time is within any closure period
  const updateCurrentTimeClosureStatus = useCallback((date, time) => {
    if (!date || !time) {
      setIsCurrentTimeClosed(false);
      setCurrentTimeClosures([]);
      return;
    }
    
    const activeClosuresAtTime = closures.filter(closure => {
      if (closure.date !== date) return false;
      const isTimeInClosure = time >= closure.startTime && time < closure.endTime;
      return isTimeInClosure;
    });
    
    setIsCurrentTimeClosed(activeClosuresAtTime.length > 0);
    setCurrentTimeClosures(activeClosuresAtTime);
  }, [closures]);

  // Check if a specific floor is closed at the selected time
  const isFloorClosed = useCallback((floor, date, time) => {
    if (!date || !time) return false;
    
    return closures.some(closure => {
      // Check if date matches
      if (closure.date !== date) return false;
      
      // Check if time falls within closure period
      const closureStart = closure.startTime;
      const closureEnd = closure.endTime;
      const isTimeInClosure = time >= closureStart && time < closureEnd;
      
      if (!isTimeInClosure) return false;
      
      // Check if this floor is affected
      if (closure.affectedAllFloors) return true;
      
      return closure.affectedFloors && closure.affectedFloors.includes(floor);
    });
  }, [closures]);

  // Get closure info for a specific floor
  const getFloorClosureInfo = useCallback((floor, date, time) => {
    if (!date || !time) return null;
    
    const closure = closures.find(c => {
      if (c.date !== date) return false;
      const isTimeInClosure = time >= c.startTime && time < c.endTime;
      if (!isTimeInClosure) return false;
      if (c.affectedAllFloors) return true;
      return c.affectedFloors && c.affectedFloors.includes(floor);
    });
    
    return closure;
  }, [closures]);

  // Check if a specific room is closed at a specific time
  const isRoomClosed = useCallback((roomName, date, time) => {
    if (!date || !time) return false;
    
    // Find the room to get its floor
    const room = rooms.find(r => r.room === roomName);
    if (!room) return false;
    
    return closures.some(closure => {
      // Check if date matches
      if (closure.date !== date) return false;
      
      // Check if time falls within closure period
      const closureStart = closure.startTime;
      const closureEnd = closure.endTime;
      const isTimeInClosure = time >= closureStart && time < closureEnd;
      
      if (!isTimeInClosure) return false;
      
      // Check if this floor is affected
      if (closure.affectedAllFloors) return true;
      
      return closure.affectedFloors && closure.affectedFloors.includes(room.floor);
    });
  }, [closures, rooms]);

  // Get closure info for a room at a specific time
  const getRoomClosureInfo = useCallback((roomName, date, time) => {
    if (!date || !time) return null;
    
    const room = rooms.find(r => r.room === roomName);
    if (!room) return null;
    
    const closure = closures.find(c => {
      if (c.date !== date) return false;
      const isTimeInClosure = time >= c.startTime && time < c.endTime;
      if (!isTimeInClosure) return false;
      if (c.affectedAllFloors) return true;
      return c.affectedFloors && c.affectedFloors.includes(room.floor);
    });
    
    return closure;
  }, [closures, rooms]);

  // Check if a time slot is closed globally
  const isTimeSlotClosed = useCallback((date, time) => {
    if (!date || !time) return false;
    
    return closures.some(closure => {
      if (closure.date !== date) return false;
      const isTimeInClosure = time >= closure.startTime && time < closure.endTime;
      return isTimeInClosure && closure.affectedAllFloors;
    });
  }, [closures]);

  // Get all closures affecting a time slot
  const getTimeSlotClosures = useCallback((date, time) => {
    if (!date || !time) return [];
    
    return closures.filter(closure => {
      if (closure.date !== date) return false;
      const isTimeInClosure = time >= closure.startTime && time < closure.endTime;
      return isTimeInClosure;
    });
  }, [closures]);

  // Update room availability check to include closures
  const isRoomAvailableForTime = useCallback((room, selectedTime) => {
    // First check if room is closed due to closure
    if (isRoomClosed(room.room, formData.date, selectedTime)) {
      return false;
    }
    
    // Then check regular reservations
    if (!roomAvailability || roomAvailability.length === 0) return true;
    
    const roomStatus = roomAvailability.find(r => r._id === room._id);
    if (!roomStatus) return true;
    
    const hasOccupied = roomStatus.occupied && roomStatus.occupied.length > 0;
    const hasPending = roomStatus.pending && roomStatus.pending.length > 0;
    
    return !hasOccupied && !hasPending;
  }, [roomAvailability, formData.date, isRoomClosed]);

  // ========== END CLOSURE SYSTEM INTEGRATION ==========

  // Check if user is from College of Law
  const isCollegeOfLawUser = useCallback(() => {
    return user?.department === "COL";
  }, [user]);

  // Check if user is a graduate student (Master's/Doctoral)
  const isGraduateStudent = useCallback(() => {
    if (!user?.course) return false;
    
    const graduateKeywords = ["Master", "Doctor", "MBA", "MPA", "MAGC", "MARS", "MAED"];
    return graduateKeywords.some(keyword => user.course.includes(keyword));
  }, [user]);

  // Check if user is Faculty
  const isFacultyUser = useCallback(() => {
    return user?.role === "Faculty" || user?.role === "Staff_Office";
  }, [user]);

  // Check if user can reserve a specific floor (with closure consideration)
  const canReserveFloor = useCallback((floor) => {
    // First check if floor is closed due to facility closure
    if (isFloorClosed(floor, formData.date, formData.time)) {
      return false;
    }
    
    // Faculty can reserve any floor
    if (isFacultyUser()) {
      return true;
    }
    
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
  }, [isGraduateStudent, isCollegeOfLawUser, isFacultyUser, isFloorClosed, formData.date, formData.time]);

  // Calendar generation functions
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

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

  const [calendarDays, setCalendarDays] = useState(generateCalendarDays(currentMonth, currentYear));

  // Generate hours from 7 AM to 3 PM with proper display
  const generateHours = () => {
    return [
      { value: "7", display: "7 AM", hour24: 7 },
      { value: "8", display: "8 AM", hour24: 8 },
      { value: "9", display: "9 AM", hour24: 9 },
      { value: "10", display: "10 AM", hour24: 10 },
      { value: "11", display: "11 AM", hour24: 11 },
      { value: "12", display: "12 PM", hour24: 12 },
      { value: "1", display: "1 PM", hour24: 13 },
      { value: "2", display: "2 PM", hour24: 14 },
      { value: "3", display: "3 PM", hour24: 15 }
    ];
  };

  // Generate minutes from 00 to 59
  const generateMinutes = () => {
    const minutes = [];
    for (let i = 0; i <= 59; i++) {
      minutes.push(i.toString().padStart(2, '0'));
    }
    return minutes;
  };

  const hours = generateHours();
  const minutes = generateMinutes();

  const formatDisplayTime = (timeValue) => {
    if (!timeValue) return "Select Time";
    const [hour24, minute] = timeValue.split(":");
    const hourNum = parseInt(hour24, 10);
    
    // Validate that the time is within 7 AM to 3 PM
    if (hourNum < 7 || hourNum > 15) {
      return "Invalid Time";
    }
    
    let displayHour = hourNum;
    let ampm = "AM";
    if (hourNum === 12) {
      ampm = "PM";
      displayHour = 12;
    } else if (hourNum > 12) {
      displayHour = hourNum - 12;
      ampm = "PM";
    }
    return `${displayHour}:${minute} ${ampm}`;
  };

  // Convert selected hour and minute to 24-hour format for storage
  const convertTo24Hour = (hourValue, minute) => {
    const hourDisplay = hourValue;
    let hour24 = 0;
    
    // Map display hour to 24-hour format
    switch(hourDisplay) {
      case "7": hour24 = 7; break;
      case "8": hour24 = 8; break;
      case "9": hour24 = 9; break;
      case "10": hour24 = 10; break;
      case "11": hour24 = 11; break;
      case "12": hour24 = 12; break;
      case "1": hour24 = 13; break;
      case "2": hour24 = 14; break;
      case "3": hour24 = 15; break;
      default: hour24 = 7;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  // Fetch room availability for selected date
  const fetchRoomAvailability = async (date, time = null) => {
    if (!date) return;
    
    setAvailabilityLoading(true);
    setAvailabilityError(null);
    
    try {
      const params = { date: date };
      if (time) {
        params.time = time;
      }
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/reservations/room-availability`, {
        params: params
      });
      
      setRoomAvailability(response.data.rooms || []);
      setSelectedAvailabilityDate(new Date(date));
      setShowAvailabilityModal(true);
    } catch (error) {
      console.error("Failed to fetch room availability:", error);
      setAvailabilityError("Failed to load room availability. Please try again.");
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Handle date selection
  const handleDateSelect = async (date) => {
    setFormData({ ...formData, date: date.date });
    setShowDateModal(false);
    
    // Reset location and room when date changes
    setFormData(prev => ({ ...prev, location: "", roomName: "", room_Id: "" }));
    setSelectedRoomDetails(null);
    
    // Fetch closures for the selected date (this will show the popup)
    await fetchClosuresForDate(date.date);
    
    // Update closure status for current time if time is already selected
    if (formData.time) {
      updateCurrentTimeClosureStatus(date.date, formData.time);
    }
    
    // Show availability modal when date is selected
    await fetchRoomAvailability(date.date, formData.time || null);
  };

  // Handle time selection with dropdown values
  const handleTimeSelect = () => {
    const timeString = convertTo24Hour(tempHour, tempMinute);
    setFormData(prev => ({ ...prev, time: timeString, location: "", roomName: "", room_Id: "" }));
    setSelectedRoomDetails(null);
    setShowTimeModal(false);
    
    // Update closure status for the selected time
    if (formData.date) {
      updateCurrentTimeClosureStatus(formData.date, timeString);
      fetchRoomAvailability(formData.date, timeString);
    }
  };

  // Reset time picker when opening modal
  const openTimeModal = () => {
    if (formData.time) {
      const [hour24, minute] = formData.time.split(":");
      const hourNum = parseInt(hour24, 10);
      let displayHour = "";
      
      // Convert 24-hour to display hour
      if (hourNum === 7) displayHour = "7";
      else if (hourNum === 8) displayHour = "8";
      else if (hourNum === 9) displayHour = "9";
      else if (hourNum === 10) displayHour = "10";
      else if (hourNum === 11) displayHour = "11";
      else if (hourNum === 12) displayHour = "12";
      else if (hourNum === 13) displayHour = "1";
      else if (hourNum === 14) displayHour = "2";
      else if (hourNum === 15) displayHour = "3";
      else displayHour = "7";
      
      setTempHour(displayHour);
      setTempMinute(minute);
    } else {
      // Default to 7:00 AM
      setTempHour("7");
      setTempMinute("00");
    }
    setShowTimeModal(true);
  };

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

    const handleRoomUpdate = (data) => {
      if (data.type === 'room_updated' || data.type === 'room_created' || data.type === 'room_deleted') {
        fetchRooms();
      }
    };

    socket.on('room_update', handleRoomUpdate);
    
    return () => {
      socket.off('room_update', handleRoomUpdate);
    };
  }, []);

  useEffect(() => {
    setCalendarDays(generateCalendarDays(currentMonth, currentYear));
  }, [currentMonth, currentYear, generateCalendarDays]);

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

  const showAlert = (message, duration = 5000) => {
    setAlertMessage(message);
    setShowAlertModal(true);
    if (duration > 0) {
      setTimeout(() => {
        setShowAlertModal(false);
      }, duration);
    }
  };

  const handleIdNumberInput = (value) => {
    return value.replace(/\D/g, '');
  };

  const scrollToElement = (ref) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      ref.current.classList.add('ring-4', 'ring-yellow-300', 'ring-opacity-50');
      setTimeout(() => {
        ref.current.classList.remove('ring-4', 'ring-yellow-300', 'ring-opacity-50');
      }, 2000);
    }
  };

  // Enhanced validateForm with closure check
  const validateForm = () => {
    if (!formData.date) {
      showAlert("Please select a date.");
      scrollToElement(dateRef);
      return false;
    }

    if (!formData.time) {
      showAlert("Please select a time.");
      scrollToElement(timeRef);
      return false;
    }

    // Check if time slot is closed globally
    if (isTimeSlotClosed(formData.date, formData.time)) {
      const closuresAtTime = getTimeSlotClosures(formData.date, formData.time);
      const closureTitles = closuresAtTime.map(c => c.title).join(", ");
      showAlert(`❌ This time slot is CLOSED due to facility closure(s): ${closureTitles}\n\nNo reservations can be made during this time. Please select a different time.`);
      scrollToElement(timeRef);
      return false;
    }

    // Validate time is within 7 AM to 3 PM
    const [hour] = formData.time.split(":");
    const hourNum = parseInt(hour, 10);
    if (hourNum < 7 || hourNum > 15) {
      showAlert("Reservations are only available from 7:00 AM to 3:00 PM.");
      scrollToElement(timeRef);
      return false;
    }

    if (!formData.location) {
      showAlert("Please select a location/floor.");
      scrollToElement(locationRef);
      return false;
    }

    // Check if selected floor is closed
    if (isFloorClosed(formData.location, formData.date, formData.time)) {
      const floorClosure = getFloorClosureInfo(formData.location, formData.date, formData.time);
      showAlert(`❌ This floor is CLOSED at the selected time due to: ${floorClosure?.title || "Facility Closure"}\n\n${floorClosure?.reason || "No reservations can be made during this time."}\n\nTime: ${floorClosure?.startTime} - ${floorClosure?.endTime}\n\nPlease select a different floor or time.`);
      scrollToElement(locationRef);
      return false;
    }

    const selectedRoom = rooms.find(room => room._id === formData.room_Id);
    if (!formData.roomName || !formData.room_Id) {
      showAlert("Please select a room.");
      scrollToElement(roomRef);
      return false;
    }

    if (selectedRoom && !selectedRoom.isActive) {
      showAlert("This room is currently unavailable. Please select another room.");
      scrollToElement(roomRef);
      return false;
    }

    // Check if selected room is closed due to facility closure
    const roomClosure = getRoomClosureInfo(formData.roomName, formData.date, formData.time);
    if (roomClosure) {
      showAlert(`❌ This room is CLOSED at the selected time due to: ${roomClosure.title}\n\n${roomClosure.reason}\n\nTime: ${roomClosure.startTime} - ${roomClosure.endTime}\n\nPlease select a different room or time.`);
      scrollToElement(roomRef);
      return false;
    }

    if (!canReserveFloor(formData.location)) {
      if (isFloorClosed(formData.location, formData.date, formData.time)) {
        const floorClosure = getFloorClosureInfo(formData.location, formData.date, formData.time);
        showAlert(`❌ This floor is CLOSED at the selected time due to: ${floorClosure?.title || "Facility Closure"}`);
      } else if (formData.location === "Ground Floor") {
        showAlert("Ground Floor is reserved for Graduate students only.");
      } else if (formData.location === "2nd Floor") {
        showAlert("2nd Floor is reserved for College of Law students only.");
      } else {
        showAlert("You don't have access to this floor.");
      }
      scrollToElement(locationRef);
      return false;
    }

    if (!formData.purpose) {
      showAlert("Please enter the purpose of reservation.");
      scrollToElement(purposeRef);
      return false;
    }

    const now = new Date();
    const selectedDate = new Date(`${formData.date}T${formData.time}`);
    if (selectedDate < now) {
      showAlert("You cannot reserve a room in the past. Please select a future date and time.");
      scrollToElement(dateRef);
      return false;
    }

    const totalUsers = parseInt(formData.numUsers);
    
    if (formData.participants.length !== totalUsers) {
      showAlert(`Form error: Expected ${totalUsers} participants for ${totalUsers} users. Please refresh the page and try again.`);
      return false;
    }

    const filledParticipants = formData.participants
      .filter((p, index) => index !== 0)
      .filter(p => p.name && p.name.trim() && p.id_number && p.id_number.toString().trim())
      .length;

    const expectedAdditionalParticipants = totalUsers - 1;

    // Faculty can reserve with just themselves
    if (!isFacultyUser() && filledParticipants !== expectedAdditionalParticipants) {
      showAlert(`Please complete all ${expectedAdditionalParticipants} additional participant fields for ${totalUsers} total users.`);
      for (let i = 1; i < formData.participants.length; i++) {
        const p = formData.participants[i];
        if (!p.name || !p.name.trim() || !p.id_number || !p.id_number.toString().trim()) {
          if (participantRefs.current[i]) {
            scrollToElement({ current: participantRefs.current[i] });
          }
          break;
        }
      }
      return false;
    }

    // For Faculty, we still want to validate if they added participants
    if (isFacultyUser() && filledParticipants > 0 && filledParticipants !== expectedAdditionalParticipants) {
      showAlert(`If adding participants, please complete all fields for all ${expectedAdditionalParticipants} additional participants.`);
      return false;
    }

    // Validate participants with Faculty exemption
    for (let i = 0; i < formData.participants.length; i++) {
      const p = formData.participants[i];
      
      // Skip validation for empty participants if user is Faculty
      if (isFacultyUser() && i > 0 && (!p.name || !p.name.trim() || !p.id_number || !p.id_number.toString().trim())) {
        continue;
      }
      
      if (!p.name || !p.department || !p.id_number) {
        showAlert(`Please complete all fields for participant ${i + 1}.`);
        if (participantRefs.current[i]) {
          scrollToElement({ current: participantRefs.current[i] });
        }
        return false;
      }

      if (!/^\d+$/.test(p.id_number)) {
        showAlert(`Participant ${i + 1} ID number should contain only numbers.`);
        if (participantRefs.current[i]) {
          scrollToElement({ current: participantRefs.current[i] });
        }
        return false;
      }

      if (p.role !== "Faculty" && p.role !== "Staff" && (!p.course || !p.year_level)) {
        showAlert(`Please complete course and year level for participant ${i + 1} (${p.name}).`);
        if (participantRefs.current[i]) {
          scrollToElement({ current: participantRefs.current[i] });
        }
        return false;
      }

      if (validation[i].status !== "valid") {
        showAlert(`Participant ${i + 1} (${p.name}) is not verified or registered.`);
        if (participantRefs.current[i]) {
          scrollToElement({ current: participantRefs.current[i] });
        }
        return false;
      }
    }

    return true;
  };

  const handleParticipantChange = async (idx, field, val) => {
    if (idx === 0 && validation[0]?.status === "valid") return;

    const updated = [...formData.participants];
    
    if (field === "id_number") {
      updated[idx][field] = handleIdNumberInput(val);
    } else {
      updated[idx][field] = val;
    }

    if (field === "id_number" && val.trim()) {
      const numericId = handleIdNumberInput(val);
      
      if (numericId && numericId.length < 5) {
        const v = [...validation];
        v[idx] = { status: "invalid", message: "ID too short", loading: false };
        setValidation(v);
        setFormData({ ...formData, participants: updated });
        return;
      }

      const isDuplicate = formData.participants.some(
        (p, i) => i !== idx && p.id_number === numericId
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
          `${import.meta.env.VITE_API_URL}/api/users/check-participant?id_number=${numericId}`
        );

        if (!res.data.exists) {
          v[idx] = { status: "invalid", message: "Not registered", loading: false };
          updated[idx] = { ...updated[idx], name: "", course: "", year_level: "", department: "", id_number: numericId, role: "" };
        } 
        else if (res.data.suspended) {
          v[idx] = { status: "invalid", message: "Account suspended", loading: false };
          updated[idx] = { ...updated[idx], name: "", course: "", year_level: "", department: "", id_number: numericId, role: "" };
        }
        else if (!res.data.verified) {
          v[idx] = { status: "invalid", message: "Not verified", loading: false };
          updated[idx] = { ...updated[idx], name: "", course: "", year_level: "", department: "", id_number: numericId, role: "" };
        } else {
          updated[idx] = {
            ...updated[idx],
            name: res.data.name,
            course: res.data.course || "",
            year_level: res.data.year_level || "",
            department: res.data.department || "",
            id_number: numericId,
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
      setFormData({ ...formData, participants: updated });
    }
  };

  const handleNumUsersChange = useCallback((val) => {
    const n = parseInt(val, 10);
    const updated = [...formData.participants];
    const v = [...validation];
    
    while (updated.length < n) {
      updated.push({ name: "", course: "", year_level: "", department: "", id_number: "", role: "" });
      v.push({ status: null, message: "", loading: false });
    }

    updated.length = n;
    v.length = n;
    
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
    
    setFormData(prev => ({ ...prev, numUsers: val, participants: updated }));
    setValidation(v);
    setShowUsersModal(false);
  }, [formData.participants, validation, user]);

  const validateParticipantFloorAccess = async () => {
    try {
      const participantIds = formData.participants
        .map(p => p.id_number)
        .filter(id => id && id.toString().trim() !== "" && id !== user.id_number);

      if (participantIds.length === 0) {
        return true;
      }

      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/reservations/validate-floor-access`, 
        {
          location: formData.location,
          participantIds: participantIds
        },
        {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.data.valid) {
        const invalidNames = response.data.invalidParticipants.map(p => p.name || p.identifier).join(', ');
        const reasons = response.data.invalidParticipants.map(p => p.reason).join(', ');
        const errorMessage = `The following participants cannot join this reservation: ${invalidNames}\n\nReasons: ${reasons}`;
        
        showAlert(errorMessage);
        
        for (let i = 1; i < formData.participants.length; i++) {
          const participantId = formData.participants[i].id_number;
          const isInvalid = response.data.invalidParticipants.some(
            p => p.id_number === participantId || p.identifier === participantId
          );
          if (isInvalid && participantRefs.current[i]) {
            scrollToElement({ current: participantRefs.current[i] });
            break;
          }
        }
        
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Floor access validation error:", error);
      let errorMsg = "Error validating participant access. Please try again.";
      
      if (error.response) {
        errorMsg = error.response.data.message || `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMsg = "No response from server. Please check your connection.";
      } else {
        errorMsg = error.message;
      }
      
      showAlert(`Floor access validation failed: ${errorMsg}`);
      return false;
    }
  };

  // Submit reservation with closure check - BLOCKS RESERVATION IF CLOSED
  const submitReservation = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    if (!user.verified) {
      setShowNotVerifiedWarning(true);
      setIsSubmitting(false);
      return;
    }

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    // Final closure check before submission - BLOCKS RESERVATION
    const floorClosure = getFloorClosureInfo(formData.location, formData.date, formData.time);
    if (floorClosure) {
      showAlert(`❌ RESERVATION BLOCKED\n\nThis floor is CLOSED at the selected time due to: ${floorClosure.title}\n\n${floorClosure.reason}\n\nTime: ${floorClosure.startTime} - ${floorClosure.endTime}\n\nPlease select a different floor or time.`);
      setIsSubmitting(false);
      return;
    }
    
    const roomClosure = getRoomClosureInfo(formData.roomName, formData.date, formData.time);
    if (roomClosure) {
      showAlert(`❌ RESERVATION BLOCKED\n\nThis room is CLOSED at the selected time due to: ${roomClosure.title}\n\n${roomClosure.reason}\n\nTime: ${roomClosure.startTime} - ${roomClosure.endTime}\n\nPlease select a different room or time.`);
      setIsSubmitting(false);
      return;
    }

    if (isTimeSlotClosed(formData.date, formData.time)) {
      const closuresAtTime = getTimeSlotClosures(formData.date, formData.time);
      const closureTitles = closuresAtTime.map(c => c.title).join(", ");
      showAlert(`❌ RESERVATION BLOCKED\n\nThis time slot is CLOSED due to: ${closureTitles}\n\nNo reservations can be made during this time.\n\nPlease select a different time.`);
      setIsSubmitting(false);
      return;
    }

    const allParticipantsHaveAccess = await validateParticipantFloorAccess();
    if (!allParticipantsHaveAccess) {
      setIsSubmitting(false);
      return;
    }

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
        setIsSubmitting(false);
        return;
      }
    } catch (err) {
      console.error("Limit check failed", err);
      const message = err.response?.data?.message || "Failed to verify reservation limit.";
      showAlert(message);
      setIsSubmitting(false);
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

      // For Faculty, filter out empty participants
      let participantsToSend = formData.participants;
      if (isFacultyUser()) {
        participantsToSend = formData.participants.filter((p, index) => {
          if (index === 0) return true;
          return p.name && p.name.trim() && p.id_number && p.id_number.toString().trim();
        });
      }

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
        numUsers: isFacultyUser() ? participantsToSend.length : parseInt(formData.numUsers),
        purpose: formData.purpose,
        participants: participantsToSend,
        timezone: "Asia/Manila",
        status: "Pending"
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/api/reservations`, reservationData);
      setShowSuccessModal(true);
    } catch (error) {
      console.error("Reservation failed:", error);
      // Check if error is due to closure
      if (error.response?.data?.isClosed) {
        showAlert(`❌ RESERVATION BLOCKED\n\n${error.response.data.message}`);
      } else {
        showAlert(`Reservation failed: ${error.response?.data?.message || error.message}`);
      }
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };

  const closeSuccess = () => {
    setShowSuccessModal(false);
    setView("dashboard");
  };

  const roomLocations = [
    "Ground Floor",
    "2nd Floor", 
    "4th Floor", 
    "5th Floor"
  ];

  const handleRoomClick = (room) => {
    // Always show room details
    setSelectedRoomDetails(room);
    
    // Check if floor is closed
    const floorIsClosed = isFloorClosed(room.floor, formData.date, formData.time);
    if (floorIsClosed) {
      const floorClosure = getFloorClosureInfo(room.floor, formData.date, formData.time);
      showAlert(`❌ This floor is CLOSED at the selected time due to: ${floorClosure?.title || "Facility Closure"}\n\n${floorClosure?.reason || ""}\n\nTime: ${floorClosure?.startTime} - ${floorClosure?.endTime}\n\nYou cannot reserve this room.`);
      return;
    }
    
    // Check if room is closed due to closure
    const roomClosure = getRoomClosureInfo(room.room, formData.date, formData.time);
    const isClosed = !!roomClosure;
    
    // Check availability for selected date and time
    const isAvailable = isRoomAvailableForTime(room, formData.time);
    const canAccess = canReserveFloor(room.floor);
    
    // Only select the room if it's active, available, user has access, and not closed
    if (room.isActive && isAvailable && canAccess && !isClosed) {
      setFormData((prev) => ({
        ...prev,
        roomName: room.room,
        room_Id: room._id,
      }));
    } else if (!room.isActive) {
      showAlert("This room is currently unavailable. You can view details but cannot reserve it.");
    } else if (isClosed && formData.date && formData.time) {
      showAlert(`❌ This room is CLOSED at the selected time due to: ${roomClosure.title}\n\n${roomClosure.reason}\n\nTime: ${roomClosure.startTime} - ${roomClosure.endTime}\n\nYou cannot reserve this room.`);
    } else if (!isAvailable && formData.date && formData.time) {
      showAlert("This room is already booked for the selected time. Please choose a different time or room.");
    } else if (!canReserveFloor(room.floor)) {
      if (room.floor === "Ground Floor") {
        showAlert("Ground Floor is reserved for Graduate students only. You can view details but cannot reserve this room.");
      } else if (room.floor === "2nd Floor") {
        showAlert("2nd Floor is reserved for College of Law students only. You can view details but cannot reserve this room.");
      } else {
        showAlert("You don't have access to this floor. You can view details but cannot reserve this room.");
      }
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
      if (image?.url) {
        return image.url;
      }
    }

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
      "2nd Floor": getRoomImageById("second_floor_1")?.url,
      "4th Floor": getRoomImageById("fifth_floor")?.url,
      "5th Floor": getRoomImageById("fifth_floor")?.url,
    };
    
    return floorImageMap[floor] || getRoomImageById("ground_floor")?.url;
  };

  const MobileParticipantCard = React.memo(({ participant, index, validation, handleChange }) => {
    const [isFocused, setIsFocused] = useState(false);
    const [localId, setLocalId] = useState(participant.id_number);
    const [localName, setLocalName] = useState(participant.name);
    const [localCourse, setLocalCourse] = useState(participant.course);
    const [localYearLevel, setLocalYearLevel] = useState(participant.year_level);
    const [localDepartment, setLocalDepartment] = useState(participant.department);
    
    const timeoutRef = useRef(null);
    const cardRef = useRef(null);
    
    useEffect(() => {
      participantRefs.current[index] = cardRef.current;
      return () => {
        participantRefs.current[index] = null;
      };
    }, [index]);
    
    useEffect(() => {
      if (!isFocused) {
        setLocalId(participant.id_number);
        setLocalName(participant.name);
        setLocalCourse(participant.course);
        setLocalYearLevel(participant.year_level);
        setLocalDepartment(participant.department);
      }
    }, [participant, isFocused]);
    
    const debouncedUpdate = (field, value) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        handleChange(index, field, value);
      }, 1000);
    };
    
    const handleIdChange = (e) => {
      const value = e.target.value.replace(/\D/g, '');
      setLocalId(value);
      debouncedUpdate("id_number", value);
    };
    
    const handleNameChange = (e) => {
      const value = e.target.value;
      setLocalName(value);
      debouncedUpdate("name", value);
    };
    
    const handleCourseChange = (e) => {
      const value = e.target.value;
      setLocalCourse(value);
      debouncedUpdate("course", value);
    };
    
    const handleYearLevelChange = (e) => {
      const value = e.target.value;
      setLocalYearLevel(value);
      debouncedUpdate("year_level", value);
    };
    
    const handleDepartmentChange = (e) => {
      const value = e.target.value;
      setLocalDepartment(value);
      debouncedUpdate("department", value);
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handleBlur = () => {
      setIsFocused(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (localId !== participant.id_number) {
        handleChange(index, "id_number", localId);
      }
      if (localName !== participant.name) {
        handleChange(index, "name", localName);
      }
      if (localCourse !== participant.course) {
        handleChange(index, "course", localCourse);
      }
      if (localYearLevel !== participant.year_level) {
        handleChange(index, "year_level", localYearLevel);
      }
      if (localDepartment !== participant.department) {
        handleChange(index, "department", localDepartment);
      }
    };
    
    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return (
      <div 
        ref={cardRef}
        className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm mb-4 touch-manipulation transition-all duration-200"
      >
        <div className="flex justify-between items-start mb-3">
          <h3 className="font-semibold text-gray-800 text-sm">Participant {index + 1}</h3>
          {index === 0 && (
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
              Main Reserver
            </span>
          )}
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">ID Number</label>
            <div className="relative">
              <input
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Enter ID Number"
                className={`w-full p-3 rounded-lg outline-none border shadow-sm transition-colors text-sm min-h-[44px]
                  ${
                    validation?.status === "valid"
                      ? "border-green-500 bg-green-50"
                      : validation?.status === "invalid"
                      ? "border-red-500 bg-red-50"
                      : isFocused
                      ? "border-[#CC0000] bg-white"
                      : "border-gray-300"
                  }`}
                value={localId}
                disabled={index === 0}
                onChange={handleIdChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
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

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input
              type="text"
              placeholder="Full Name"
              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-sm min-h-[44px]"
              value={localName}
              disabled={index === 0 || validation.status === "valid"}
              onChange={handleNameChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {(!participant.role || (participant.role !== "Faculty" && participant.role !== "Staff")) && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Course</label>
                  <input
                    type="text"
                    placeholder="Course"
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-sm min-h-[44px]"
                    value={localCourse}
                    disabled={index === 0 || validation.status === "valid"}
                    onChange={handleCourseChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Year Level</label>
                  <input
                    type="text"
                    placeholder="Year Level"
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-sm min-h-[44px]"
                    value={localYearLevel}
                    disabled={index === 0 || validation.status === "valid"}
                    onChange={handleYearLevelChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Department</label>
            <input
              type="text"
              placeholder="Department"
              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:border-[#CC0000] transition-colors text-sm min-h-[44px]"
              value={localDepartment}
              disabled={index === 0 || validation.status === "valid"}
              onChange={handleDepartmentChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

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
  }, (prevProps, nextProps) => {
    return (
      prevProps.participant.id_number === nextProps.participant.id_number &&
      prevProps.participant.name === nextProps.participant.name &&
      prevProps.participant.course === nextProps.participant.course &&
      prevProps.participant.year_level === nextProps.participant.year_level &&
      prevProps.participant.department === nextProps.participant.department &&
      prevProps.validation.status === nextProps.validation.status &&
      prevProps.validation.message === nextProps.validation.message &&
      prevProps.validation.loading === nextProps.validation.loading
    );
  });

  MobileParticipantCard.displayName = 'MobileParticipantCard';

  const [loadedImages, setLoadedImages] = useState(new Set());

  const handleImageLoad = (imageId) => {
    setLoadedImages(prev => new Set(prev).add(imageId));
  };

  // Helper to check if a floor has active closure at current time
  const getFloorClosureForCurrentTime = (floor) => {
    return getFloorClosureInfo(floor, formData.date, formData.time);
  };

  return (
    <main className="w-full min-h-screen flex flex-col bg-gray-50 lg:pl-[250px]">
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

      {/* CLOSURE WARNING HEADER - ALWAYS VISIBLE WHEN THERE ARE CLOSURES */}
      {(globalClosure || closedFloors.length > 0 || isCurrentTimeClosed) && formData.date && (
        <div className={`sticky top-0 z-40 px-4 py-2 shadow-md ${
          globalClosure ? "bg-red-600" : isCurrentTimeClosed ? "bg-red-500" : "bg-orange-500"
        } text-white`}>
          <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <AlertTriangle size={18} className="flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {globalClosure ? (
                  <>
                    <span className="font-semibold">⚠️ FACILITY CLOSURE:</span>
                    <span className="ml-1 text-sm">{globalClosure.title}</span>
                    <span className="hidden sm:inline text-xs ml-2">
                      ({globalClosure.startTime} - {globalClosure.endTime})
                    </span>
                  </>
                ) : isCurrentTimeClosed ? (
                  <>
                    <span className="font-semibold">⛔ TIME SLOT CLOSED:</span>
                    <span className="ml-1 text-sm">
                      {currentTimeClosures.map(c => c.title).join(", ")}
                    </span>
                    <span className="hidden sm:inline text-xs ml-2">
                      ({formData.time} is within closure period)
                    </span>
                  </>
                ) : closedFloors.length > 0 ? (
                  <>
                    <span className="font-semibold">⚠️ FLOOR CLOSURE NOTICE:</span>
                    <span className="ml-1 text-sm">
                      {closedFloors.join(", ")} {closedFloors.length === 1 ? "is" : "are"} CLOSED
                    </span>
                    <span className="hidden sm:inline text-xs ml-2">
                      at {formData.time || "selected time"}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
            <button
              onClick={() => setShowClosureListModal(true)}
              className="text-white hover:text-gray-200 text-xs sm:text-sm underline whitespace-nowrap flex items-center gap-1"
            >
              <Info size={14} />
              View Details
            </button>
          </div>
        </div>
      )}

      {/* Specific closure alert for selected floor (if applicable) */}
      {formData.location && formData.date && formData.time && (() => {
        const floorClosure = getFloorClosureForCurrentTime(formData.location);
        if (floorClosure && !globalClosure && !isCurrentTimeClosed) {
          return (
            <div className="bg-red-500 text-white px-4 py-2 sticky top-0 z-40 shadow-md">
              <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={18} />
                  <span className="font-semibold">⛔ FLOOR CLOSED:</span>
                  <span className="text-sm">{floorClosure.title}</span>
                  <span className="text-xs ml-1">({floorClosure.startTime} - {floorClosure.endTime})</span>
                </div>
                <button
                  onClick={() => setShowClosureListModal(true)}
                  className="text-white hover:text-gray-200 text-xs underline"
                >
                  Details
                </button>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <header className="text-black px-4 sm:px-6 h-[60px] flex items-center justify-between shadow-sm bg-white sticky top-0 z-30">
        <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-wide">Room Reservation Request</h1>
        <button 
          onClick={() => setView("dashboard")}
          className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 flex items-center cursor-pointer min-h-[44px] min-w-[44px] justify-center px-2"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          <span className="hidden sm:inline">Back to Dashboard</span>
          <span className="sm:hidden">Back</span>
        </button>
      </header>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-x-hidden">
        {/* User Type Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-blue-800 font-medium text-sm sm:text-base">
              {isFacultyUser() 
                ? "Faculty Access: You can reserve any floor and can make reservations with just yourself."
                : isCollegeOfLawUser()
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
            <div className="space-y-1" ref={dateRef}>
              <p className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Select Date
              </p>
              <button
                onClick={() => setShowDateModal(true)}
                className={`w-full p-3 sm:p-3 border rounded-lg shadow-sm outline-none focus:border-[#CC0000] flex items-center cursor-pointer hover:bg-gray-50 transition-colors text-sm sm:text-base min-h-[44px] justify-between ${
                  !formData.date ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              >
                <span className={formData.date ? "text-gray-800 truncate" : "text-gray-400 font-semibold truncate"}>
                  {formData.date ? (
                    new Date(formData.date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })
                  ) : "Select Date"}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!formData.date && (
                <p className="text-xs text-red-500 mt-1">Date is required</p>
              )}
            </div>

            {/* Time Selector */}
            <div className="space-y-1" ref={timeRef}>
              <p className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select Time (7 AM - 3 PM)
              </p>
              <button
                onClick={openTimeModal}
                className={`w-full p-3 sm:p-3 border rounded-lg shadow-sm outline-none focus:border-[#CC0000] flex items-center cursor-pointer hover:bg-gray-50 transition-colors text-sm sm:text-base min-h-[44px] justify-between ${
                  !formData.time ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
              >
                <span className={formData.time ? "text-gray-800 truncate" : "text-gray-400 font-semibold truncate"}>
                  {formData.time ? formatDisplayTime(formData.time) : "Select Time"}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {!formData.time && (
                <p className="text-xs text-red-500 mt-1">Time is required</p>
              )}
              {formData.time && isTimeSlotClosed(formData.date, formData.time) && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertTriangle size={12} />
                  This time slot is CLOSED due to facility closure
                </p>
              )}
            </div>

            {/* Number of Users Selector */}
            <div className="space-y-1">
              <p className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Number of Users
              </p>
              <button
                onClick={() => setShowUsersModal(true)}
                className="w-full p-3 sm:p-3 border rounded-lg border-gray-300 shadow-sm outline-none focus:border-[#CC0000] flex items-center cursor-pointer hover:bg-gray-50 transition-colors text-sm sm:text-base min-h-[44px] justify-between"
              >
                <span className={formData.numUsers ? "text-gray-800 truncate" : "text-gray-400 truncate"}>
                  {formData.numUsers ? `${formData.numUsers} Users` : "Select Users"}
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>

          {/* Purpose */}
          <div className="mt-3 sm:mt-4" ref={purposeRef}>
            <p className="font-medium text-gray-700 flex items-center text-sm sm:text-base">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Purpose
            </p>
            <input
              className={`w-full p-3 sm:p-3 mt-1 border rounded-lg shadow-sm outline-none focus:border-[#CC0000] text-sm sm:text-base font-semibold min-h-[44px] ${
                !formData.purpose ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
              type="text"
              value={formData.purpose}
              onChange={(e) =>
                setFormData({ ...formData, purpose: e.target.value })
              }
              placeholder="Enter purpose of reservation"
            />
            {!formData.purpose && (
              <p className="text-xs text-red-500 mt-1">Purpose is required</p>
            )}
          </div>
        </div>

        {/* Date Selection Modal */}
        {showDateModal && (
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[400px] shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <button 
                  onClick={() => handleMonthChange(-1)}
                  className="p-2 sm:p-3 rounded-full hover:bg-gray-100 font-bold cursor-pointer transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  &lt;
                </button>
                <h2 className="text-lg sm:text-xl font-semibold">
                  {months[currentMonth]} {currentYear}
                </h2>
                <button 
                  onClick={() => handleMonthChange(1)}
                  className="p-2 sm:p-3 rounded-full hover:bg-gray-100 font-bold cursor-pointer transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                        onClick={() => handleDateSelect(day)}
                        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors text-sm sm:text-base font-medium min-w-[40px] min-h-[40px]
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
                      <div className="w-10 h-10 sm:w-12 sm:h-12"></div>
                    )}
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowDateModal(false)}
                className="mt-4 bg-[#CC0000] text-white px-4 py-3 rounded-lg hover:bg-red-700 transition w-full cursor-pointer font-semibold min-h-[44px]"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Time Selection Modal */}
        {showTimeModal && (
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[400px] shadow-xl">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Select Time (7 AM - 3 PM)
              </h2>

              {/* Hour Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Hour</label>
                <select
                  value={tempHour}
                  onChange={(e) => setTempHour(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#CC0000] focus:outline-none text-base"
                >
                  <option value="7">7:00 AM</option>
                  <option value="8">8:00 AM</option>
                  <option value="9">9:00 AM</option>
                  <option value="10">10:00 AM</option>
                  <option value="11">11:00 AM</option>
                  <option value="12">12:00 PM</option>
                  <option value="1">1:00 PM</option>
                  <option value="2">2:00 PM</option>
                  <option value="3">3:00 PM</option>
                </select>
              </div>

              {/* Minute Dropdown */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Minute</label>
                <select
                  value={tempMinute}
                  onChange={(e) => setTempMinute(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:border-[#CC0000] focus:outline-none text-base"
                >
                  {minutes.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute}
                    </option>
                  ))}
                </select>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleTimeSelect}
                  className="flex-1 bg-[#CC0000] text-white px-4 py-3 rounded-lg hover:bg-red-700 transition font-semibold min-h-[44px]"
                >
                  Confirm
                </button>
                <button
                  onClick={() => setShowTimeModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-400 transition font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Number of Users Modal */}
        {showUsersModal && (
          <div className="fixed top-0 left-0 w-screen h-screen bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white p-4 sm:p-6 rounded-xl w-full max-w-[350px] shadow-xl">
              <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6 mr-2 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Number of Users
              </h2>
              <div className="grid grid-cols-1 gap-2 sm:gap-3 font-bold mb-4">
                {[4, 5, 6, 7, 8].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      handleNumUsersChange(num.toString());
                      setShowUsersModal(false);
                    }}
                    className={`p-4 sm:p-4 border border-gray-300 rounded-lg text-center cursor-pointer transition-colors text-sm sm:text-base min-h-[44px]
                      ${
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
                className="mt-4 bg-[#CC0000] text-white px-4 py-3 rounded-lg hover:bg-red-700 transition w-full cursor-pointer font-semibold min-h-[44px]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Room Location */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100" ref={locationRef}>
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Room Location</h2>
          <div className="flex flex-wrap gap-3 sm:gap-5 justify-center">
            {roomLocations.map((loc) => {
              const imageSrc = getFloorImage(loc);
              const canReserve = canReserveFloor(loc);
              const floorIsClosed = isFloorClosed(loc, formData.date, formData.time);
              const floorClosure = getFloorClosureInfo(loc, formData.date, formData.time);
              const isSelected = formData.location === loc;

              return (
                <button
                  key={loc}
                  onClick={() => {
                    if (floorIsClosed) {
                      showAlert(`❌ This floor is CLOSED at the selected time due to: ${floorClosure?.title || "Facility Closure"}\n\n${floorClosure?.reason || ""}\n\nTime: ${floorClosure?.startTime} - ${floorClosure?.endTime}\n\nYou cannot reserve this floor.`);
                      return;
                    }
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
                  className={`border-2 rounded-2xl w-full xs:w-[150px] sm:w-[180px] md:w-[200px] h-[120px] sm:h-[150px] md:h-[200px] flex flex-col justify-center items-center cursor-pointer transition-all duration-200 overflow-hidden relative min-h-[120px] ${
                    isSelected 
                      ? "border-[#CC0000] ring-2 ring-red-100 opacity-100 scale-105" 
                      : floorIsClosed
                      ? "border-red-300 opacity-50 cursor-not-allowed bg-gray-100"
                      : !canReserve
                      ? "border-gray-200 opacity-50 cursor-not-allowed"
                      : "border-gray-200 opacity-70 hover:opacity-100 hover:border-gray-300"
                  }`}
                  disabled={floorIsClosed || !canReserve}
                >
                  {imageSrc && (
                    <img
                      src={imageSrc}
                      alt={loc}
                      className="absolute w-full h-full object-cover"
                      loading="lazy"
                      onLoad={() => handleImageLoad(`floor-${loc}`)}
                    />
                  )}
                  <div className={`absolute inset-0 ${
                    floorIsClosed ? "bg-red-800/70" : "bg-black/40"
                  }`}></div>
                  
                  {/* Closure Badge */}
                  {floorIsClosed && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      CLOSED
                    </div>
                  )}
                  
                  {/* Restricted Badge */}
                  {!canReserve && !floorIsClosed && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                      Restricted
                    </div>
                  )}
                  
                  <div className="relative z-10 text-white text-center px-2 drop-shadow-md">
                    <p className="text-sm sm:text-base md:text-lg font-semibold mb-1">
                      {loc}
                    </p>
                    {(loc === "Ground Floor" || loc === "2nd Floor") && !floorIsClosed && (
                      <p className="text-xs sm:text-sm opacity-90">
                        {loc === "Ground Floor" ? "Graduate Studies & Periodicals" : "Law Library"}
                      </p>
                    )}
                    {floorIsClosed && floorClosure && (
                      <p className="text-xs opacity-90 mt-1">
                        {floorClosure.title.length > 30 ? floorClosure.title.substring(0, 30) + "..." : floorClosure.title}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {!formData.location && (
            <p className="text-xs text-red-500 text-center mt-2">Please select a location</p>
          )}
          {formData.location && isFloorClosed(formData.location, formData.date, formData.time) && (
            <p className="text-xs text-red-500 text-center mt-2 flex items-center justify-center gap-1">
              <AlertTriangle size={12} />
              This floor is CLOSED at the selected time. Please select a different floor or time.
            </p>
          )}
        </div>

        {/* Room Selection */}
        {formData.location && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100" ref={roomRef}>
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Select Room</h2>

            {isFloorClosed(formData.location, formData.date, formData.time) ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertTriangle className="text-red-600 mx-auto mb-2" size={32} />
                <p className="text-red-800 font-semibold">This floor is CLOSED at the selected time</p>
                <p className="text-red-600 text-sm mt-1">No rooms are available on this floor. Please select a different floor or time.</p>
              </div>
            ) : (
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
                    const isAvailable = isRoomAvailableForTime(room, formData.time);
                    const isSelected = formData.room_Id === room._id;
                    const isBooked = !isAvailable && formData.date && formData.time && !isRoomClosed(room.room, formData.date, formData.time);
                    const roomClosure = getRoomClosureInfo(room.room, formData.date, formData.time);
                    const isClosedByClosure = !!roomClosure;
                    const floorIsClosed = isFloorClosed(room.floor, formData.date, formData.time);

                    return (
                      <button
                        key={room._id}
                        onClick={() => handleRoomClick(room)}
                        className={`border-2 rounded-2xl w-full sm:w-[280px] md:w-[300px] h-[250px] sm:h-[280px] md:h-[300px] flex justify-center items-center cursor-pointer relative overflow-hidden transition-all duration-200 ${
                          isSelected && room.isActive && canReserve && isAvailable && !isClosedByClosure && !floorIsClosed
                            ? "border-[#CC0000] ring-2 ring-red-100 bg-red-50"
                            : isSelected && (!room.isActive || !canReserve || !isAvailable || isClosedByClosure || floorIsClosed)
                            ? "border-gray-400 ring-2 ring-gray-200 bg-gray-50"
                            : isDisabled || !canReserve || isBooked || isClosedByClosure || floorIsClosed
                            ? "border-gray-300 bg-gray-100 cursor-pointer opacity-60"
                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {roomImage && (
                          <img
                            src={roomImage}
                            alt={room.room}
                            className="absolute w-full h-full object-cover"
                            loading="lazy"
                            onLoad={() => handleImageLoad(`room-${room._id}`)}
                          />
                        )}
                        <div className={`absolute inset-0 z-0 ${
                          isDisabled || !canReserve || isBooked || isClosedByClosure || floorIsClosed ? "bg-gray-800/70" : "bg-black/30"
                        }`}></div>
                        
                        {/* Floor Closure Badge */}
                        {floorIsClosed && (
                          <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10 flex items-center gap-1">
                            <AlertTriangle size={12} />
                            Floor CLOSED
                          </div>
                        )}
                        
                        {/* Room Status Badge */}
                        {isDisabled && !floorIsClosed && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                            Unavailable
                          </div>
                        )}
                        
                        {/* Closure Badge */}
                        {isClosedByClosure && !isDisabled && !floorIsClosed && (
                          <div className="absolute top-2 right-2 bg-orange-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                            CLOSED
                          </div>
                        )}
                        
                        {/* Booked Badge */}
                        {isBooked && !isDisabled && !isClosedByClosure && !floorIsClosed && (
                          <div className="absolute top-2 right-2 bg-yellow-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                            Booked
                          </div>
                        )}
                        
                        {/* Restricted Badge */}
                        {!canReserve && !isDisabled && !isBooked && !isClosedByClosure && !floorIsClosed && (
                          <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                            Restricted
                          </div>
                        )}
                        
                        {/* View Details Badge */}
                        {(isDisabled || !canReserve || isBooked || isClosedByClosure || floorIsClosed) && (
                          <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-semibold z-10">
                            Click to View Details
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
                      </button>
                    );
                  })}
              </div>
            )}
            {!formData.roomName && !isFloorClosed(formData.location, formData.date, formData.time) && (
              <p className="text-xs text-red-500 text-center mt-2">Please select a room</p>
            )}
          </div>
        )}

        {/* Selected Room Details */}
        {selectedRoomDetails && (
          <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Selected Room Details</h2>
            
            {/* Show floor closure info if applicable */}
            {(() => {
              const floorClosure = getFloorClosureInfo(selectedRoomDetails.floor, formData.date, formData.time);
              if (floorClosure) {
                return (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-red-800 font-semibold text-sm">❌ Floor CLOSED: {floorClosure.title}</p>
                        <p className="text-red-700 text-xs mt-1">{floorClosure.reason}</p>
                        <p className="text-red-600 text-xs mt-1 font-medium">
                          Time: {floorClosure.startTime} - {floorClosure.endTime}
                        </p>
                        <p className="text-red-600 text-xs mt-1 font-bold">
                          You cannot reserve this room.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            {/* Show room closure info if applicable */}
            {(() => {
              const roomClosure = getRoomClosureInfo(selectedRoomDetails.room, formData.date, formData.time);
              if (roomClosure && !getFloorClosureInfo(selectedRoomDetails.floor, formData.date, formData.time)) {
                return (
                  <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={18} />
                      <div>
                        <p className="text-red-800 font-semibold text-sm">❌ Room CLOSED: {roomClosure.title}</p>
                        <p className="text-red-700 text-xs mt-1">{roomClosure.reason}</p>
                        <p className="text-red-600 text-xs mt-1 font-medium">
                          Time: {roomClosure.startTime} - {roomClosure.endTime}
                        </p>
                        <p className="text-red-600 text-xs mt-1 font-bold">
                          You cannot reserve this room.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              <div className="md:col-span-2">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-3 sm:mb-4 gap-2">
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 break-words">{selectedRoomDetails.room}</h3>
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
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Participants Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 ">
            Participants ({formData.participants.length})
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 italic mt-2 sm:mt-3 mb-3 sm:mb-4 pb-2 border-b border-gray-100">
            * Enter ID Number to auto-fill participant details. Verified fields will be locked.
            {isFacultyUser() && (
              <span className="block text-green-600 font-medium mt-1">
                Faculty: You can reserve with just yourself. Additional participants are optional.
              </span>
            )}
          </p>
          
          {/* Mobile View - Card Layout */}
          {isMobile ? (
            <div className="space-y-4">
              {formData.participants.map((participant, index) => (
                <MobileParticipantCard
                  key={index}
                  participant={participant}
                  index={index}
                  validation={validation[index]}
                  handleChange={handleParticipantChange}
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
                    <tr 
                      key={idx} 
                      ref={el => participantRefs.current[idx] = el}
                      className={`${idx % 2 === 0 ? "bg-white" : "bg-gray-50 hover:bg-gray-100"} transition-colors duration-200`}
                    >
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        <div className="relative">
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            placeholder="ID Number"
                            className={`w-full p-2 sm:p-2 pr-8 sm:pr-10 rounded-lg outline-none border shadow-sm transition-colors text-xs sm:text-sm min-h-[36px]
                              ${
                                validation[idx]?.status === "valid"
                                  ? "border-green-500 bg-green-50"
                                  : validation[idx]?.status === "invalid"
                                  ? "border-red-500 bg-red-50"
                                  : "border-gray-300 focus:border-[#CC0000]"
                              }`}
                            value={p.id_number}
                            disabled={idx === 0}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '');
                              handleParticipantChange(idx, "id_number", value);
                            }}
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck="false"
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
                        {!p.id_number && (
                          <p className="text-xs text-red-500 mt-1">ID is required</p>
                        )}
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        <input
                          type="text"
                          placeholder="Full Name"
                          className={`w-full p-2 sm:p-2 border rounded-lg outline-none focus:border-[#CC0000] transition-colors text-xs sm:text-sm min-h-[36px] ${
                            !p.name ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
                          value={p.name}
                          disabled={idx === 0 || validation[idx].status === "valid"}
                          onChange={(e) =>
                            handleParticipantChange(idx, "name", e.target.value)
                          }
                        />
                      </td>
                      {(!p.role || (p.role !== "Faculty" && p.role !== "Staff")) ? (
                        <td className="py-2 px-2 sm:py-3 sm:px-4">
                          <input
                            type="text"
                            placeholder="Course"
                            className={`w-full p-2 sm:p-2 border rounded-lg outline-none focus:border-[#CC0000] transition-colors text-xs sm:text-sm min-h-[36px] ${
                              !p.course ? "border-red-300 bg-red-50" : "border-gray-300"
                            }`}
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
                      {(!p.role || (p.role !== "Faculty" && p.role !== "Staff")) ? (
                        <td className="py-2 px-2 sm:py-3 sm:px-4">
                          <input
                            type="text"
                            placeholder="Year Level"
                            className={`w-full p-2 sm:p-2 border rounded-lg outline-none focus:border-[#CC0000] transition-colors text-xs sm:text-sm min-h-[36px] ${
                              !p.year_level ? "border-red-300 bg-red-50" : "border-gray-300"
                            }`}
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
                          className={`w-full p-2 sm:p-2 border rounded-lg outline-none focus:border-[#CC0000] transition-colors text-xs sm:text-sm min-h-[36px] ${
                            !p.department ? "border-red-300 bg-red-50" : "border-gray-300"
                          }`}
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
        </div>

        {/* Notes Section */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 border border-gray-100">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-3 sm:mb-4 pb-2 border-b border-gray-100">Important Notes</h2>
          <ul className="space-y-1 sm:space-y-2">
            <li className="text-xs sm:text-sm text-gray-600 flex items-start">
              <span className="text-red-600 font-bold mr-1">•</span>
              Reservations are available from 7:00 AM to 3:00 PM only.
            </li>
            <li className="text-xs sm:text-sm text-gray-600 flex items-start">
              <span className="text-red-600 font-bold mr-1">•</span>
              The group will be notified fifteen (15) minutes before the usage is terminated. If there are no standing reservations for the next hour, the group may request a one-hour extension.
            </li>
            <li className="text-xs sm:text-sm text-gray-600 flex items-start">
              <span className="text-red-600 font-bold mr-1">•</span>
              The Learning Resource Center reserves the right to cancel the reservation of any group that does not arrive within fifteen (15) minutes of the scheduled reservation time.
            </li>
            {isFacultyUser() && (
              <li className="text-xs sm:text-sm text-green-600 flex items-start font-medium">
                <span className="text-green-600 font-bold mr-1">•</span>
                Faculty: You can reserve rooms with just yourself. Additional participants are optional.
              </li>
            )}
            {globalClosure && (
              <li className="text-xs sm:text-sm text-red-600 flex items-start font-medium">
                <span className="text-red-600 font-bold mr-1">•</span>
                ⚠️ Facility Closure Notice: {globalClosure.title} - {globalClosure.startTime} to {globalClosure.endTime}
              </li>
            )}
            {closedFloors.length > 0 && !globalClosure && (
              <li className="text-xs sm:text-sm text-orange-600 flex items-start font-medium">
                <span className="text-orange-600 font-bold mr-1">•</span>
                ⚠️ Floor Closure Notice: {closedFloors.join(", ")} {closedFloors.length === 1 ? "is" : "are"} CLOSED at the selected time.
              </li>
            )}
          </ul>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            onClick={submitReservation}
            type="button"
            disabled={loading || (selectedRoomDetails && !selectedRoomDetails.isActive) || isSubmitting || (globalClosure && isTimeSlotClosed(formData.date, formData.time)) || (closedFloors.length > 0 && closedFloors.includes(formData.location)) || (formData.location && isFloorClosed(formData.location, formData.date, formData.time)) || isCurrentTimeClosed}
            className={`px-6 sm:px-8 py-3 sm:py-3 rounded-lg transition cursor-pointer flex items-center text-sm sm:text-base min-h-[44px] min-w-[140px] justify-center ${
              loading || (selectedRoomDetails && !selectedRoomDetails.isActive) || isSubmitting || (globalClosure && isTimeSlotClosed(formData.date, formData.time)) || (closedFloors.length > 0 && closedFloors.includes(formData.location)) || (formData.location && isFloorClosed(formData.location, formData.date, formData.time)) || isCurrentTimeClosed
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
                {globalClosure && isTimeSlotClosed(formData.date, formData.time) ? "Time Slot CLOSED" : 
                 isCurrentTimeClosed ? "Time Slot CLOSED" :
                 (closedFloors.length > 0 && closedFloors.includes(formData.location) ? "Floor CLOSED" :
                 (formData.location && isFloorClosed(formData.location, formData.date, formData.time) ? "Floor CLOSED" :
                 (selectedRoomDetails && !selectedRoomDetails.isActive ? "Room Unavailable" : "Submit Reservation")))}
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
              className="bg-[#CC0000] text-white px-4 py-3 rounded-lg hover:bg-red-700 transition w-full cursor-pointer font-semibold min-h-[44px]"
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
              className="bg-[#CC0000] text-white px-4 py-3 rounded-lg hover:bg-red-700 transition w-full cursor-pointer font-semibold min-h-[44px]"
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
              className="bg-[#CC0000] text-white px-4 py-3 rounded-lg hover:bg-red-700 transition w-full cursor-pointer font-semibold min-h-[44px]"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Closure Details Modal (Single Closure) */}
      {showClosureModal && globalClosure && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-full max-w-[450px] shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle size={24} />
                Facility Closure Notice
              </h2>
              <button
                onClick={() => setShowClosureModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-gray-800">{globalClosure.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{globalClosure.reason}</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar size={16} />
                <span>{new Date(globalClosure.date).toLocaleDateString()}</span>
                <Clock size={16} className="ml-2" />
                <span>{globalClosure.startTime} - {globalClosure.endTime}</span>
              </div>
              {globalClosure.affectedAllFloors ? (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">Affects: All Floors</p>
                  <p className="text-red-600 text-xs mt-1">No reservations can be made during this time.</p>
                </div>
              ) : (
                <div className="bg-red-50 p-3 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">Affected Floors:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {globalClosure.affectedFloors?.map((floor, idx) => (
                      <span key={idx} className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                        {floor}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => setShowClosureModal(false)}
                className="w-full mt-4 bg-[#CC0000] text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLOSURE LIST MODAL */}
      {showClosureListModal && activeClosuresList.length > 0 && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <AlertTriangle size={24} />
                Facility Closures on {formData.date ? new Date(formData.date).toLocaleDateString() : "Selected Date"}
              </h2>
              <button
                onClick={() => setShowClosureListModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-2">
                <p className="text-red-800 font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  ⚠️ RESERVATIONS ARE BLOCKED
                </p>
                <p className="text-red-700 text-sm mt-1">
                  The following closures are active on this date. You cannot make reservations during these times or on affected floors.
                </p>
              </div>
              {activeClosuresList.map((closure, idx) => (
                <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold text-red-800 text-lg">{closure.title}</h3>
                  <p className="text-red-700 text-sm mt-1">{closure.reason || "No reason provided"}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-red-600">
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{closure.startTime} - {closure.endTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Building2 size={14} />
                      <span>
                        {closure.affectedAllFloors 
                          ? "All Floors" 
                          : closure.affectedFloors?.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              <button
                onClick={() => setShowClosureListModal(false)}
                className="w-full mt-2 bg-[#CC0000] text-white px-4 py-3 rounded-lg hover:bg-red-700 transition font-semibold"
              >
                I Understand - Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Room Availability Modal */}
      {showAvailabilityModal && (
        <RoomAvailabilityModal
          selectedDate={selectedAvailabilityDate}
          roomStatuses={roomAvailability}
          availLoading={availabilityLoading}
          availError={availabilityError}
          onClose={() => setShowAvailabilityModal(false)}
          currentUserId={user?._id}
        />
      )}
    </main>
  );
}

export default ReserveRoom;