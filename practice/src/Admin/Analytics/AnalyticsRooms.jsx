// AnalyticsRooms.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  DoorOpen,
  TrendingUp,
  CalendarCheck,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart,
  Activity,
  Users,
  Calendar,
  X,
  MapPin,
  Building,
  Wifi,
  Wind,
  Monitor,
  Video,
  Coffee,
  Smartphone,
  Home
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsRooms({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [roomData, setRoomData] = useState({
    total: 0,
    available: 0,
    occupied: 0,
    maintenance: 0,
    utilization: 0,
    byType: {
      lecture: 0,
      laboratory: 0,
      conference: 0,
      office: 0,
      general: 0
    },
    roomDetails: [],
    hourlyUtilization: [],
    topRooms: [],
    byFloor: {},
    byCapacity: {
      small: 0,    // 4-6 pax
      medium: 0,   // 7-8 pax
      large: 0,    // 9-10 pax
      xlarge: 0    // 11+ pax
    },
    trends: {
      total: { value: 0, percentage: 0, direction: 'up' },
      utilization: { value: 0, percentage: 0, direction: 'up' },
      available: { value: 0, percentage: 0, direction: 'up' },
      occupied: { value: 0, percentage: 0, direction: 'up' }
    },
    growth: {
      labels: [],
      values: []
    },
    roomTypeDistribution: [],
    floorDistribution: [],
    capacityDistribution: [],
    featureStats: {
      wifi: 0,
      aircon: 0,
      projector: 0,
      monitor: 0
    },
    peakHours: [],
    utilizationByType: {},
    bookingTrends: [],
    maintenanceHistory: [],
    topUsers: []
  });

  const calendarRef = useRef(null);

  const fetchRoomAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/analytics/rooms/detailed?range=${dateRange}`;
      
      // Add custom date parameters if custom range is selected
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/rooms/detailed?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      console.log("Fetching room analytics from:", url);
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        setRoomData(response.data.data);
        console.log("Room analytics data loaded:", response.data.data);
      } else {
        console.error("API returned unsuccessful response:", response.data);
        // Fallback to mock data if API fails
        setRoomData(getMockRoomData(dateRange, customStartDate, customEndDate));
      }
    } catch (error) {
      console.error("Error fetching room analytics:", error);
      // Fallback to mock data
      setRoomData(getMockRoomData(dateRange, customStartDate, customEndDate));
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  useEffect(() => {
    fetchRoomAnalytics();
  }, [fetchRoomAnalytics]);

  // Close calendar when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCustomDate(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Mock data generator (for fallback)
  const getMockRoomData = (range, customStart, customEnd) => {
    const now = new Date();
    let totalRooms = 25;
    
    // Adjust based on range
    let utilizationBase = 68;
    if (range === 'week') utilizationBase = 72;
    if (range === 'year') utilizationBase = 65;
    if (range === 'custom' && customStart && customEnd) utilizationBase = 70;

    // Generate growth data based on range
    let growthLabels = [];
    let growthValues = [];
    
    if (range === 'week') {
      growthLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      growthValues = [45, 52, 68, 72, 85, 38, 22];
    } else if (range === 'month') {
      growthLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      growthValues = [280, 310, 295, 340];
    } else if (range === 'year') {
      growthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      growthValues = [850, 920, 880, 950, 1020, 980, 890, 910, 950, 980, 1010, 1050];
    } else if (range === 'custom') {
      growthLabels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
      growthValues = [280, 310, 295, 340];
    }

    return {
      total: totalRooms,
      available: Math.floor(totalRooms * 0.4),
      occupied: Math.floor(totalRooms * 0.35),
      maintenance: Math.floor(totalRooms * 0.1),
      utilization: utilizationBase,
      byType: {
        lecture: 12,
        laboratory: 6,
        conference: 4,
        office: 3,
        general: 0
      },
      roomDetails: [
        { 
          id: 1, name: "Room 101", type: "Lecture", floor: "1st Floor", capacity: 6, 
          bookings: 450, utilization: 78, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: false },
          lastMaintenance: "2024-01-15 10:30:45", nextMaintenance: "2024-04-15"
        },
        { 
          id: 2, name: "Room 102", type: "Lecture", floor: "1st Floor", capacity: 4, 
          bookings: 380, utilization: 68, status: "occupied", features: { wifi: true, aircon: true, projector: false, monitor: true },
          lastMaintenance: "2024-02-10 14:22:30", nextMaintenance: "2024-05-10"
        },
        { 
          id: 3, name: "Room 103", type: "Lecture", floor: "1st Floor", capacity: 8, 
          bookings: 520, utilization: 85, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: true },
          lastMaintenance: "2024-01-20 09:15:00", nextMaintenance: "2024-04-20"
        },
        { 
          id: 4, name: "Room 104", type: "Laboratory", floor: "1st Floor", capacity: 5, 
          bookings: 280, utilization: 62, status: "maintenance", features: { wifi: true, aircon: true, projector: false, monitor: true },
          lastMaintenance: "2024-03-01 11:45:20", nextMaintenance: "2024-06-01"
        },
        { 
          id: 5, name: "Room 201", type: "Conference", floor: "2nd Floor", capacity: 7, 
          bookings: 290, utilization: 52, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: false },
          lastMaintenance: "2024-02-05 13:10:55", nextMaintenance: "2024-05-05"
        },
        { 
          id: 6, name: "Room 202", type: "Lecture", floor: "2nd Floor", capacity: 6, 
          bookings: 410, utilization: 72, status: "occupied", features: { wifi: true, aircon: true, projector: true, monitor: true },
          lastMaintenance: "2024-01-25 16:30:10", nextMaintenance: "2024-04-25"
        },
        { 
          id: 7, name: "Room 203", type: "Laboratory", floor: "2nd Floor", capacity: 4, 
          bookings: 230, utilization: 55, status: "available", features: { wifi: true, aircon: false, projector: true, monitor: true },
          lastMaintenance: "2024-02-15 08:45:30", nextMaintenance: "2024-05-15"
        },
        { 
          id: 8, name: "Lab A", type: "Laboratory", floor: "3rd Floor", capacity: 8, 
          bookings: 340, utilization: 70, status: "occupied", features: { wifi: true, aircon: true, projector: false, monitor: true },
          lastMaintenance: "2024-03-05 10:20:15", nextMaintenance: "2024-06-05"
        },
        { 
          id: 9, name: "Lab B", type: "Laboratory", floor: "3rd Floor", capacity: 7, 
          bookings: 260, utilization: 58, status: "maintenance", features: { wifi: true, aircon: true, projector: false, monitor: true },
          lastMaintenance: "2024-02-20 15:40:25", nextMaintenance: "2024-05-20"
        },
        { 
          id: 10, name: "Conference A", type: "Conference", floor: "3rd Floor", capacity: 5, 
          bookings: 210, utilization: 48, status: "available", features: { wifi: true, aircon: true, projector: true, monitor: false },
          lastMaintenance: "2024-03-10 12:05:50", nextMaintenance: "2024-06-10"
        },
        { 
          id: 11, name: "Room 301", type: "Office", floor: "3rd Floor", capacity: 4, 
          bookings: 120, utilization: 35, status: "available", features: { wifi: true, aircon: true, projector: false, monitor: false },
          lastMaintenance: "2024-02-25 09:30:00", nextMaintenance: "2024-05-25"
        },
        { 
          id: 12, name: "Room 302", type: "Office", floor: "3rd Floor", capacity: 6, 
          bookings: 140, utilization: 40, status: "occupied", features: { wifi: true, aircon: true, projector: false, monitor: false },
          lastMaintenance: "2024-01-30 14:55:40", nextMaintenance: "2024-04-30"
        }
      ],
      hourlyUtilization: [
        { hour: "8AM", utilization: 45, bookings: 12 },
        { hour: "9AM", utilization: 65, bookings: 18 },
        { hour: "10AM", utilization: 82, bookings: 24 },
        { hour: "11AM", utilization: 88, bookings: 26 },
        { hour: "12PM", utilization: 72, bookings: 20 },
        { hour: "1PM", utilization: 68, bookings: 19 },
        { hour: "2PM", utilization: 85, bookings: 25 },
        { hour: "3PM", utilization: 90, bookings: 28 },
        { hour: "4PM", utilization: 78, bookings: 22 },
        { hour: "5PM", utilization: 62, bookings: 16 }
      ],
      topRooms: [
        { name: "Room 103", bookings: 520, utilization: 85, type: "Lecture", capacity: 8, floor: "1st Floor", features: { wifi: true, aircon: true, projector: true, monitor: true } },
        { name: "Room 101", bookings: 450, utilization: 78, type: "Lecture", capacity: 6, floor: "1st Floor", features: { wifi: true, aircon: true, projector: true, monitor: false } },
        { name: "Room 202", bookings: 410, utilization: 72, type: "Lecture", capacity: 6, floor: "2nd Floor", features: { wifi: true, aircon: true, projector: true, monitor: true } },
        { name: "Room 102", bookings: 380, utilization: 68, type: "Lecture", capacity: 4, floor: "1st Floor", features: { wifi: true, aircon: true, projector: false, monitor: true } },
        { name: "Lab A", bookings: 340, utilization: 70, type: "Laboratory", capacity: 8, floor: "3rd Floor", features: { wifi: true, aircon: true, projector: false, monitor: true } },
        { name: "Room 201", bookings: 290, utilization: 52, type: "Conference", capacity: 7, floor: "2nd Floor", features: { wifi: true, aircon: true, projector: true, monitor: false } },
        { name: "Room 104", bookings: 280, utilization: 62, type: "Laboratory", capacity: 5, floor: "1st Floor", features: { wifi: true, aircon: true, projector: false, monitor: true } },
        { name: "Lab B", bookings: 260, utilization: 58, type: "Laboratory", capacity: 7, floor: "3rd Floor", features: { wifi: true, aircon: true, projector: false, monitor: true } },
        { name: "Room 203", bookings: 230, utilization: 55, type: "Laboratory", capacity: 4, floor: "2nd Floor", features: { wifi: true, aircon: false, projector: true, monitor: true } },
        { name: "Conference A", bookings: 210, utilization: 48, type: "Conference", capacity: 5, floor: "3rd Floor", features: { wifi: true, aircon: true, projector: true, monitor: false } }
      ],
      byFloor: {
        "1st Floor": 4,
        "2nd Floor": 3,
        "3rd Floor": 5
      },
      byCapacity: {
        small: 13,    // 4-6 pax
        medium: 0,    // 7-8 pax
        large: 0,     // 9-10 pax
        xlarge: 0     // 11+ pax
      },
      trends: {
        total: { value: totalRooms, percentage: 4.2, direction: 'up' },
        utilization: { value: utilizationBase, percentage: 2.1, direction: 'up' },
        available: { value: 10, percentage: 5.0, direction: 'up' },
        occupied: { value: 9, percentage: 3.5, direction: 'down' }
      },
      growth: {
        labels: growthLabels,
        values: growthValues
      },
      roomTypeDistribution: [
        { name: 'Lecture Halls', value: 12, color: 'blue' },
        { name: 'Laboratories', value: 6, color: 'green' },
        { name: 'Conference Rooms', value: 4, color: 'purple' },
        { name: 'Offices', value: 3, color: 'orange' }
      ],
      floorDistribution: [
        { name: '1st Floor', value: 4 },
        { name: '2nd Floor', value: 3 },
        { name: '3rd Floor', value: 5 }
      ],
      capacityDistribution: [
        { name: '4-6 pax', value: 13 },
        { name: '7-8 pax', value: 0 },
        { name: '9-10 pax', value: 0 },
        { name: '11+ pax', value: 0 }
      ],
      featureStats: {
        wifi: 12,
        aircon: 10,
        projector: 8,
        monitor: 7
      },
      peakHours: [
        { hour: '10:00 AM', utilization: 92, bookings: 8 },
        { hour: '11:00 AM', utilization: 88, bookings: 7 },
        { hour: '2:00 PM', utilization: 85, bookings: 7 },
        { hour: '3:00 PM', utilization: 90, bookings: 8 },
        { hour: '4:00 PM', utilization: 78, bookings: 6 }
      ],
      utilizationByType: {
        lecture: 76,
        laboratory: 62,
        conference: 50,
        office: 38
      },
      bookingTrends: [
        { month: 'Jan', bookings: 450 },
        { month: 'Feb', bookings: 480 },
        { month: 'Mar', bookings: 520 },
        { month: 'Apr', bookings: 490 },
        { month: 'May', bookings: 530 },
        { month: 'Jun', bookings: 510 }
      ],
      maintenanceHistory: [
        { room: 'Room 104', date: '2024-03-01 11:45:20', type: 'AC Repair', status: 'Completed' },
        { room: 'Lab B', date: '2024-02-20 15:40:25', type: 'Equipment Check', status: 'Completed' },
        { room: 'Room 203', date: '2024-02-15 08:45:30', type: 'Projector Maintenance', status: 'Completed' }
      ],
      topUsers: [
        { name: 'Dr. Smith', department: 'Engineering', bookings: 45, room: 'Room 103' },
        { name: 'Prof. Johnson', department: 'Science', bookings: 38, room: 'Lab A' },
        { name: 'Dr. Williams', department: 'Mathematics', bookings: 32, room: 'Room 202' }
      ]
    };
  };

  const formatDateTime = (date) => {
    if (!date) return "—";
    try {
      const d = new Date(date);
      return d.toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).replace(/(\d+)\/(\d+)\/(\d+),/, '$3-$1-$2'); // Reformat to YYYY-MM-DD
    } catch (error) {
      return "Invalid date";
    }
  };

  const formatDate = (date) => {
    if (!date) return "";
    try {
      return new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      });
    } catch (error) {
      return "";
    }
  };

  const handleCustomDateApply = () => {
    if (customStartDate && customEndDate) {
      // Validate that start date is before end date
      if (new Date(customStartDate) > new Date(customEndDate)) {
        alert("Start date must be before end date");
        return;
      }
      
      setDateRange("custom");
      setShowCustomDate(false);
    } else {
      alert("Please select both start and end dates");
    }
  };

  const handleCustomDateClear = () => {
    setCustomStartDate("");
    setCustomEndDate("");
    setShowCustomDate(false);
    setDateRange("month");
  };

  // Export to CSV function
  const exportToCSV = () => {
    try {
      // Create CSV content with Excel-friendly formatting
      let csvContent = "";
      
      // Helper to add a row with proper Excel formatting
      const addRow = (cells) => {
        const formattedCells = cells.map(cell => {
          if (cell === null || cell === undefined) return '';
          
          let stringCell = String(cell);
          
          // Handle long text
          if (stringCell.length > 50) {
            stringCell = stringCell.replace(/(.{50})/g, '$1\n');
          }
          
          // Escape commas, quotes, and newlines for CSV
          if (stringCell.includes(',') || stringCell.includes('"') || stringCell.includes('\n') || stringCell.includes('\r')) {
            return `"${stringCell.replace(/"/g, '""')}"`;
          }
          return stringCell;
        });
        
        csvContent += formattedCells.join(',') + '\n';
      };

      const addBlankRow = () => {
        csvContent += '\n';
      };

      const addSectionHeader = (title, subtitle = '') => {
        addRow(['========== ' + title.toUpperCase() + ' ==========']);
        if (subtitle) {
          addRow([subtitle]);
        }
        addBlankRow();
      };

      const addSubHeader = (title) => {
        addRow(['--- ' + title + ' ---']);
      };

      // Get date range description
      let rangeDescription = "";
      if (dateRange === "week") rangeDescription = "Last 7 Days";
      else if (dateRange === "month") rangeDescription = "Last 30 Days";
      else if (dateRange === "year") rangeDescription = "Last 12 Months";
      else if (dateRange === "custom") rangeDescription = `${formatDate(customStartDate)} to ${formatDate(customEndDate)}`;

      // ==================== REPORT HEADER ====================
      addBlankRow();
      addRow(['ROOM ANALYTICS REPORT']);
      addRow(['========================================']);
      addBlankRow();
      addRow(['Generated:', new Date().toLocaleString()]);
      addRow(['Date Range:', rangeDescription]);
      addRow(['Report ID:', `RPT-ROOM-${Date.now()}`]);
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 1: KEY METRICS ====================
      addSectionHeader('SECTION 1: KEY METRICS');
      
      addRow(['Metric', 'Current Value', 'Change %', 'Trend', 'Notes']);
      addRow([
        'TOTAL ROOMS', 
        (roomData.total || 0).toLocaleString(),
        `${roomData.trends?.total?.percentage || 0}%`,
        roomData.trends?.total?.direction === 'up' ? 'Increasing' : 'Decreasing',
        'Total available rooms'
      ]);
      addRow([
        'AVAILABLE', 
        (roomData.available || 0).toLocaleString(),
        `${roomData.trends?.available?.percentage || 0}%`,
        roomData.trends?.available?.direction === 'up' ? 'Increasing' : 'Decreasing',
        'Ready for booking'
      ]);
      addRow([
        'OCCUPIED', 
        (roomData.occupied || 0).toLocaleString(),
        `${roomData.trends?.occupied?.percentage || 0}%`,
        roomData.trends?.occupied?.direction === 'up' ? 'Increasing' : 'Decreasing',
        'Currently in use'
      ]);
      addRow([
        'MAINTENANCE', 
        (roomData.maintenance || 0).toLocaleString(),
        'N/A',
        'N/A',
        'Under maintenance'
      ]);
      addRow([
        'UTILIZATION RATE', 
        (roomData.utilization || 0) + '%',
        `${roomData.trends?.utilization?.percentage || 0}%`,
        roomData.trends?.utilization?.direction === 'up' ? 'Increasing' : 'Decreasing',
        'Overall room usage'
      ]);
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 2: FLOOR DISTRIBUTION ====================
      addSectionHeader('SECTION 2: FLOOR DISTRIBUTION');
      
      addRow(['Floor', 'Rooms', 'Percentage', 'Most Active Room']);
      
      const floorData = Object.entries(roomData.byFloor || {}).map(([floor, count]) => {
        const percentage = roomData.total > 0 ? Math.round((count / roomData.total) * 100) : 0;
        let mostActive = '';
        
        // Find most active room on this floor
        const roomsOnFloor = roomData.roomDetails?.filter(r => r.floor === floor) || [];
        if (roomsOnFloor.length > 0) {
          const topRoom = roomsOnFloor.reduce((max, room) => 
            room.bookings > max.bookings ? room : max, roomsOnFloor[0]);
          mostActive = topRoom.name;
        }
        
        return { floor, count, percentage, mostActive };
      });

      floorData.sort((a, b) => b.count - a.count).forEach(item => {
        addRow([
          item.floor,
          item.count.toLocaleString(),
          item.percentage + '%',
          item.mostActive || 'N/A'
        ]);
      });
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 3: HOURLY UTILIZATION ====================
      addSectionHeader('SECTION 3: HOURLY UTILIZATION PATTERNS');
      
      addRow(['Time Slot', 'Utilization %', 'Bookings', 'Peak Status']);
      
      (roomData.hourlyUtilization || []).forEach(hour => {
        const isPeak = hour.utilization > 80 ? '★ Peak Hour' : 
                      hour.utilization > 60 ? 'Moderate' : 'Off-Peak';
        
        addRow([
          hour.hour,
          hour.utilization + '%',
          (hour.bookings || 0).toLocaleString(),
          isPeak
        ]);
      });
      addBlankRow();
      
      // Find peak hours
      const peakHours = (roomData.hourlyUtilization || []).filter(h => h.utilization > 80);
      if (peakHours.length > 0) {
        addRow(['Peak Hours Summary:']);
        addRow([`- Busiest Time: ${peakHours[0]?.hour} (${peakHours[0]?.utilization}% utilization)`]);
        addRow([`- Total Peak Hours: ${peakHours.length}`]);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 4: FEATURES STATISTICS ====================
      addSectionHeader('SECTION 4: ROOM FEATURES');
      
      addRow(['Feature', 'Rooms with Feature', 'Percentage', 'Popularity Rank']);
      
      const features = [
        { name: 'WiFi', count: roomData.featureStats?.wifi || 0 },
        { name: 'Air Conditioning', count: roomData.featureStats?.aircon || 0 },
        { name: 'Projector', count: roomData.featureStats?.projector || 0 },
        { name: 'Monitor', count: roomData.featureStats?.monitor || 0 }
      ];

      features.sort((a, b) => b.count - a.count).forEach((feature, idx) => {
        const percentage = roomData.total > 0 ? Math.round((feature.count / roomData.total) * 100) : 0;
        
        addRow([
          feature.name,
          feature.count.toLocaleString(),
          percentage + '%',
          '#' + (idx + 1)
        ]);
      });
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 5: TOP ROOMS ====================
      addSectionHeader('SECTION 5: TOP PERFORMING ROOMS');
      
      addRow(['Rank', 'Room Name', 'Type', 'Floor', 'Capacity', 'Bookings', 'Utilization', 'Performance']);
      
      (roomData.topRooms || []).slice(0, 10).forEach((room, index) => {
        let performance = 'Excellent';
        if (room.utilization < 40) performance = 'Low';
        else if (room.utilization < 60) performance = 'Average';
        else if (room.utilization < 80) performance = 'Good';
        
        addRow([
          '#' + (index + 1),
          room.name,
          room.type || 'N/A',
          room.floor || 'N/A',
          room.capacity || 0,
          room.bookings.toLocaleString(),
          room.utilization + '%',
          performance
        ]);
      });
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 6: ROOM DETAILS ====================
      addSectionHeader('SECTION 6: COMPREHENSIVE ROOM DETAILS');
      
      addRow(['Room', 'Type', 'Floor', 'Capacity', 'Bookings', 'Utilization', 'Status', 'Last Maintenance', 'Features']);
      
      (roomData.roomDetails || []).forEach(room => {
        const features = [];
        if (room.features?.wifi) features.push('WiFi');
        if (room.features?.aircon) features.push('AC');
        if (room.features?.projector) features.push('Projector');
        if (room.features?.monitor) features.push('Monitor');
        
        addRow([
          room.name,
          room.type,
          room.floor || 'N/A',
          room.capacity || 0,
          (room.bookings || 0).toLocaleString(),
          (room.utilization || 0) + '%',
          room.status || 'N/A',
          room.lastMaintenance || 'N/A',
          features.join(', ') || 'None'
        ]);
      });
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 7: MAINTENANCE HISTORY ====================
      addSectionHeader('SECTION 7: MAINTENANCE HISTORY');
      
      if (roomData.maintenanceHistory && roomData.maintenanceHistory.length > 0) {
        addRow(['Room', 'Date & Time', 'Maintenance Type', 'Status']);
        
        roomData.maintenanceHistory.forEach(item => {
          addRow([
            item.room,
            item.date,
            item.type,
            item.status
          ]);
        });
      } else {
        addRow(['No maintenance history available for this period']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 8: TOP USERS ====================
      addSectionHeader('SECTION 8: TOP ROOM USERS');
      
      if (roomData.topUsers && roomData.topUsers.length > 0) {
        addRow(['Rank', 'User Name', 'Department', 'Bookings', 'Preferred Room']);
        
        roomData.topUsers.forEach((user, index) => {
          addRow([
            '#' + (index + 1),
            user.name,
            user.department || 'N/A',
            user.bookings.toLocaleString(),
            user.room || 'N/A'
          ]);
        });
      } else {
        addRow(['No top user data available for this period']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 9: BOOKING TRENDS ====================
      addSectionHeader('SECTION 9: BOOKING TRENDS');
      
      addRow(['Period', 'Bookings', 'Change', 'Trend']);
      
      if (roomData.bookingTrends && roomData.bookingTrends.length > 0) {
        roomData.bookingTrends.forEach((item, index) => {
          let change = 'N/A';
          let trend = 'N/A';
          
          if (index > 0) {
            const prevBookings = roomData.bookingTrends[index - 1].bookings;
            const diff = item.bookings - prevBookings;
            change = (diff > 0 ? '+' : '') + diff;
            trend = diff > 0 ? 'Growing ↑' : diff < 0 ? 'Declining ↓' : 'Stable';
          }
          
          addRow([
            item.month,
            item.bookings.toLocaleString(),
            change,
            trend
          ]);
        });
      } else {
        addRow(['No booking trend data available']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 10: EXECUTIVE SUMMARY ====================
      addSectionHeader('SECTION 10: EXECUTIVE SUMMARY & KEY INSIGHTS');
      
      // Calculate insights
      const totalRooms = roomData.total || 0;
      const availableRooms = roomData.available || 0;
      const occupiedRooms = roomData.occupied || 0;
      const maintenanceRooms = roomData.maintenance || 0;
      const utilizationRate = roomData.utilization || 0;
      
      addRow(['Area', 'Finding', 'Recommendation']);
      
      // Utilization insight
      addRow([
        'Room Utilization',
        utilizationRate >= 70 ? 'Healthy utilization rate' : 'Below target utilization',
        utilizationRate >= 70 ? 'Maintain current scheduling' : 'Consider promoting room availability'
      ]);
      
      // Availability insight
      addRow([
        'Room Availability',
        availableRooms > 5 ? 'Good availability' : 'Limited availability',
        availableRooms > 5 ? 'Continue current operations' : 'Consider adding more rooms'
      ]);
      
      // Maintenance insight
      if (maintenanceRooms > 2) {
        addRow([
          'Maintenance',
          `${maintenanceRooms} rooms under maintenance`,
          'Review maintenance schedule to minimize impact'
        ]);
      }
      
      // Feature insight
      const leastFeature = Object.entries(roomData.featureStats || {}).reduce(
        (min, [feature, count]) => count < min.count ? { feature, count } : min,
        { feature: 'none', count: Infinity }
      );
      
      if (leastFeature.feature !== 'none' && leastFeature.count < totalRooms * 0.3) {
        addRow([
          'Feature Gap',
          `Only ${leastFeature.count} rooms have ${leastFeature.feature}`,
          `Consider adding ${leastFeature.feature} to more rooms`
        ]);
      }
      
      addBlankRow();
      addBlankRow();

      // ==================== FOOTER ====================
      addRow(['========================================']);
      addRow(['END OF REPORT']);
      addRow(['Generated by Analytics System']);
      addRow([new Date().toLocaleString()]);

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Room Analytics ${dateRange} ${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  // ==================== SKELETON LOADING COMPONENTS ====================

  const StatCardSkeleton = () => (
    <div className="flex-1 min-w-[200px] bg-white p-4 rounded-lg border border-gray-200 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
          <div className="h-8 bg-gray-300 rounded w-16"></div>
          <div className="flex items-center gap-1 mt-2">
            <div className="h-4 bg-gray-200 rounded w-12"></div>
          </div>
        </div>
        <div className="p-2">
          <div className="w-5 h-5 bg-gray-300 rounded"></div>
        </div>
      </div>
    </div>
  );

  const ProgressBarSkeleton = () => (
    <div className="animate-pulse">
      <div className="flex justify-between mb-1">
        <div className="h-4 bg-gray-200 rounded w-24"></div>
        <div className="h-4 bg-gray-200 rounded w-12"></div>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-gray-300 rounded-full h-2 w-3/4"></div>
      </div>
    </div>
  );

  const TableRowSkeleton = ({ cols = 5 }) => (
    <tr className="animate-pulse">
      {Array(cols).fill(0).map((_, i) => (
        <td key={i} className="px-6 py-4 whitespace-nowrap">
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </td>
      ))}
    </tr>
  );

  const ChartSkeleton = () => (
    <div className="h-64 flex items-end justify-between gap-2 animate-pulse">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-gray-200 rounded-t" style={{ height: `${Math.random() * 150 + 50}px` }}></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
      ))}
    </div>
  );

  const GrowthChartSkeleton = () => (
    <div className="h-64 flex items-end justify-between gap-2 animate-pulse">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-gray-200 rounded-t h-40"></div>
          <div className="h-3 bg-gray-200 rounded w-8"></div>
        </div>
      ))}
    </div>
  );

  const TableSkeleton = ({ rows = 5, cols = 5 }) => (
    <div className="overflow-x-auto animate-pulse">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            {Array(cols).fill(0).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {Array(rows).fill(0).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array(cols).fill(0).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const SectionHeaderSkeleton = () => (
    <div className="flex items-center justify-between mb-4">
      <div className="h-6 bg-gray-200 rounded w-48"></div>
      <div className="h-4 bg-gray-200 rounded w-24"></div>
    </div>
  );

  // ==================== COMPONENTS ====================

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue", subtext, isLoading = false }) => {
    const getColorClass = (colorName) => {
      const colorMap = {
        blue: "text-blue-500",
        green: "text-green-500",
        purple: "text-purple-500",
        yellow: "text-yellow-500",
        orange: "text-orange-500",
        red: "text-red-500",
        indigo: "text-indigo-500"
      };
      return colorMap[colorName] || "text-blue-500";
    };

    const getBgColorClass = (colorName) => {
      const colorMap = {
        blue: "bg-blue-100",
        green: "bg-green-100",
        purple: "bg-purple-100",
        yellow: "bg-yellow-100",
        orange: "bg-orange-100",
        red: "bg-red-100",
        indigo: "bg-indigo-100"
      };
      return colorMap[colorName] || "bg-blue-100";
    };

    if (isLoading) {
      return <StatCardSkeleton />;
    }

    return (
      <div className="flex-1 min-w-[200px] bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">
              {typeof value === 'number' ? value.toLocaleString() : value}
              {title.includes('Utilization') && '%'}
            </p>
            {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
            {trend && trend.percentage > 0 && (
              <div className="flex items-center gap-1 mt-1">
                {trend.direction === 'up' ? (
                  <ArrowUp size={16} className="text-green-500" />
                ) : trend.direction === 'down' ? (
                  <ArrowDown size={16} className="text-red-500" />
                ) : null}
                <span className={trend.direction === 'up' ? "text-green-500 text-sm" : "text-red-500 text-sm"}>
                  {trend.percentage}%
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 ${getBgColorClass(color)} rounded-lg`}>
            <Icon className={getColorClass(color)} size={20} />
          </div>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, total, color = "blue", showValue = true, isLoading = false }) => {
    const rawPercentage = total > 0 ? (value / total) * 100 : 0;
    const percentage = Math.min(Math.round(rawPercentage), 100);
    
    const getBgColorClass = (colorName) => {
      const colorMap = {
        blue: "bg-blue-500",
        green: "bg-green-500",
        purple: "bg-purple-500",
        orange: "bg-orange-500",
        yellow: "bg-yellow-500",
        red: "bg-red-500",
        indigo: "bg-indigo-500"
      };
      return colorMap[colorName] || "bg-blue-500";
    };

    if (isLoading) {
      return <ProgressBarSkeleton />;
    }

    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 truncate max-w-[60%]" title={label}>
            {label}
          </span>
          <div className="flex items-center gap-2">
            {showValue && <span className="text-sm font-semibold text-gray-900">{value.toLocaleString()}</span>}
            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
              {percentage}%
            </span>
          </div>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`${getBgColorClass(color)} rounded-full h-2.5 transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  const FeatureBadge = ({ feature, available }) => (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
      available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
    }`}>
      {feature === 'wifi' && <Wifi size={12} />}
      {feature === 'aircon' && <Wind size={12} />}
      {feature === 'projector' && <Video size={12} />}
      {feature === 'monitor' && <Monitor size={12} />}
      <span className="capitalize">{feature}</span>
    </span>
  );

  // Find max value for hourly chart scaling
  const maxHourlyUtilization = Math.max(...(roomData.hourlyUtilization || []).map(h => h.utilization), 1);
  const maxGrowthValue = Math.max(...(roomData.growth?.values || []), 1);
  const chartHeight = 200;

  // ==================== RENDER ====================

  if (loading && !roomData.total) {
    return (
      <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
        {/* Header Skeleton */}
        <header className="bg-white px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <div className="h-10 bg-gray-200 rounded w-16 mx-1 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-16 mx-1 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-16 mx-1 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded w-20 mx-1 animate-pulse"></div>
              </div>
              <div className="h-10 bg-gray-200 rounded w-20 animate-pulse"></div>
              <div className="h-10 bg-gray-200 rounded w-10 animate-pulse"></div>
            </div>
          </div>
        </header>

        {/* Main Content Skeleton */}
        <div className="p-6">
          {/* Key Metrics Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-4">
            <SectionHeaderSkeleton />
            <div className="flex flex-wrap gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          {/* Floor Distribution Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <div className="space-y-4">
              <ProgressBarSkeleton />
              <ProgressBarSkeleton />
              <ProgressBarSkeleton />
            </div>
          </div>

          {/* Features Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-200 rounded-lg w-10 h-10"></div>
                  <div>
                    <div className="h-3 bg-gray-200 rounded w-20 mb-2"></div>
                    <div className="h-5 bg-gray-300 rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hourly Utilization Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <ChartSkeleton />
          </div>

          {/* Top Rooms Table Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <TableSkeleton rows={5} cols={7} />
          </div>

          {/* Room Details Table Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <SectionHeaderSkeleton />
            <TableSkeleton rows={5} cols={8} />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#CC0000]">
              Room Analytics
            </h1>
            <p className="text-gray-600">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Monitor room utilization, availability, and performance'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            {/* Date Range Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1 relative">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => {
                    setDateRange(range);
                    setShowCustomDate(false);
                  }}
                  className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                    dateRange === range && !showCustomDate
                      ? "bg-[#CC0000] text-white"
                      : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  {range === 'week' ? 'Week' : 
                   range === 'month' ? 'Month' : 
                   'Year'}
                </button>
              ))}
              
              {/* Custom Date Button */}
              <button
                onClick={() => setShowCustomDate(!showCustomDate)}
                className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                  showCustomDate || dateRange === 'custom'
                    ? "bg-[#CC0000] text-white"
                    : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
                }`}
              >
                <Calendar size={14} />
                <span>Custom</span>
              </button>

              {/* Custom Date Range Picker */}
              {showCustomDate && (
                <div 
                  ref={calendarRef}
                  className="absolute top-12 right-0 bg-white p-4 rounded-lg shadow-lg border border-gray-200 z-50 w-72"
                >
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Select Date Range</h3>
                    <button
                      onClick={() => setShowCustomDate(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Start Date</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        max={customEndDate || undefined}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">End Date</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
                        min={customStartDate || undefined}
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleCustomDateApply}
                        className="flex-1 bg-[#CC0000] text-white text-sm py-2 rounded-lg hover:bg-[#990000] transition-colors"
                      >
                        Apply
                      </button>
                      <button
                        onClick={handleCustomDateClear}
                        className="flex-1 bg-gray-200 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Export to CSV Button */}
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer"
              title="Export to CSV"
            >
              <Download size={18} />
              <span>Excel</span>
            </button>

            {/* Refresh Button */}
            <button 
              onClick={fetchRoomAnalytics}
              className="p-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-50 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-6">
        {/* Key Metrics Cards */}
        <div className="flex flex-col gap-4 mb-6 w-full">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Room Status Overview</h2>
            <div className="flex flex-wrap gap-4">
              <StatCard 
                title="Total Rooms" 
                value={roomData.total} 
                icon={DoorOpen} 
                trend={roomData.trends?.total}
                color="blue" 
                isLoading={loading}
              />
              <StatCard 
                title="Available" 
                value={roomData.available} 
                icon={CheckCircle} 
                trend={roomData.trends?.available}
                color="green" 
                subtext="Ready for booking"
                isLoading={loading}
              />
              <StatCard 
                title="Occupied" 
                value={roomData.occupied} 
                icon={Activity} 
                trend={roomData.trends?.occupied}
                color="orange" 
                subtext="Currently in use"
                isLoading={loading}
              />
              <StatCard 
                title="Maintenance" 
                value={roomData.maintenance} 
                icon={AlertCircle} 
                color="red" 
                subtext="Under maintenance"
                isLoading={loading}
              />
              <StatCard 
                title="Utilization Rate" 
                value={roomData.utilization} 
                icon={TrendingUp} 
                trend={roomData.trends?.utilization}
                color="purple" 
                subtext="Overall usage"
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Floor Distribution - Progress Bars */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Rooms by Floor</h2>
          {loading ? (
            <div className="space-y-4">
              <ProgressBarSkeleton />
              <ProgressBarSkeleton />
              <ProgressBarSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(roomData.byFloor || {}).map(([floor, count], index) => {
                const colors = ["blue", "green", "purple"];
                return (
                  <ProgressBar 
                    key={floor}
                    label={floor} 
                    value={count} 
                    total={roomData.total || 1} 
                    color={colors[index % 3]}
                    isLoading={loading}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wifi size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rooms with WiFi</p>
                <p className="text-xl font-bold text-gray-800">{roomData.featureStats?.wifi || 0}</p>
                <p className="text-xs text-gray-500">
                  {Math.round(((roomData.featureStats?.wifi || 0) / (roomData.total || 1)) * 100)}% of total
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wind size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rooms with AC</p>
                <p className="text-xl font-bold text-gray-800">{roomData.featureStats?.aircon || 0}</p>
                <p className="text-xs text-gray-500">
                  {Math.round(((roomData.featureStats?.aircon || 0) / (roomData.total || 1)) * 100)}% of total
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Video size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rooms with Projector</p>
                <p className="text-xl font-bold text-gray-800">{roomData.featureStats?.projector || 0}</p>
                <p className="text-xs text-gray-500">
                  {Math.round(((roomData.featureStats?.projector || 0) / (roomData.total || 1)) * 100)}% of total
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Monitor size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Rooms with Monitor</p>
                <p className="text-xl font-bold text-gray-800">{roomData.featureStats?.monitor || 0}</p>
                <p className="text-xs text-gray-500">
                  {Math.round(((roomData.featureStats?.monitor || 0) / (roomData.total || 1)) * 100)}% of total
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Utilization - Fixed Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Hourly Utilization</h2>
          {loading ? (
            <ChartSkeleton />
          ) : (
            <div>
              <div className="h-64 flex items-end justify-between gap-2">
                {(roomData.hourlyUtilization || []).map((hour, index) => {
                  const height = maxHourlyUtilization > 0 ? (hour.utilization / maxHourlyUtilization) * 200 : 0;
                  const isPeak = hour.utilization > 80;
                  
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex justify-center group">
                        <div 
                          className={`w-3/4 ${isPeak ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-[#CC0000] to-[#FF4444]'} rounded-t transition-all duration-300 hover:from-[#990000] hover:to-[#CC0000] cursor-pointer`}
                          style={{ height: `${height}px` }}
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {hour.utilization}% • {hour.bookings || 0} bookings
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-600 font-medium">{hour.hour}</span>
                      <span className="text-sm text-gray-800">{hour.utilization}%</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
                <div>Peak hours: &gt;80% utilization</div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded"></div>
                    <span>Normal usage</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gradient-to-t from-green-500 to-green-400 rounded"></div>
                    <span>Peak hours</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Growth Chart - Fixed like AnalyticsReservations */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Room Booking Growth - {dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : dateRange === 'year' ? 'Monthly' : 'Custom Period'}
          </h2>
          {loading ? (
            <GrowthChartSkeleton />
          ) : (
            <div>
              <div className="h-64 flex items-end justify-between gap-2">
                {roomData.growth?.values && roomData.growth.values.length > 0 ? (
                  roomData.growth.values.map((value, index) => {
                    const max = Math.max(...roomData.growth.values, 1);
                    const height = max > 0 ? (value / max) * 200 : 0;
                    
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex justify-center group">
                          <div 
                            className="w-3/4 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded-t transition-all duration-300 hover:from-[#990000] hover:to-[#CC0000] cursor-pointer"
                            style={{ height: `${height}px` }}
                          >
                            {/* Tooltip */}
                            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                              {value} bookings
                            </div>
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 font-medium">{roomData.growth.labels?.[index] || ''}</span>
                        <span className="text-xs text-gray-800">{value}</span>
                      </div>
                    );
                  })
                ) : (
                  <div className="w-full text-center text-gray-500 py-12">
                    No growth data available for this period
                  </div>
                )}
              </div>
              
              {roomData.growth?.values && roomData.growth.values.length > 0 && (
                <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
                  <div>Total bookings: {roomData.growth.values.reduce((a, b) => a + b, 0)}</div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-gradient-to-t from-[#CC0000] to-[#FF4444] rounded"></div>
                    <span>Bar height relative to peak period</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Rooms Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Performing Rooms</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">Type</th>
                  <th className="px-6 py-3 text-left font-medium">Floor</th>
                  <th className="px-6 py-3 text-left font-medium">Capacity</th>
                  <th className="px-6 py-3 text-left font-medium">Bookings</th>
                  <th className="px-6 py-3 text-left font-medium">Utilization</th>
                  <th className="px-6 py-3 text-left font-medium">Features</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    <TableRowSkeleton cols={7} />
                    <TableRowSkeleton cols={7} />
                    <TableRowSkeleton cols={7} />
                    <TableRowSkeleton cols={7} />
                    <TableRowSkeleton cols={7} />
                  </>
                ) : (
                  (roomData.topRooms || []).slice(0, 10).map((room, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{room.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{room.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{room.floor || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800">{room.capacity || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{room.bookings}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`rounded-full h-2 ${
                                room.utilization > 80 ? 'bg-green-500' :
                                room.utilization > 60 ? 'bg-blue-500' :
                                room.utilization > 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(room.utilization, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-600 text-sm">{Math.min(room.utilization, 100)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex gap-1">
                          {room.features?.wifi && <Wifi size={14} className="text-blue-500" title="WiFi" />}
                          {room.features?.aircon && <Wind size={14} className="text-green-500" title="Aircon" />}
                          {room.features?.projector && <Video size={14} className="text-purple-500" title="Projector" />}
                          {room.features?.monitor && <Monitor size={14} className="text-orange-500" title="Monitor" />}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Room Details Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Room Details & Status</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">Type</th>
                  <th className="px-6 py-3 text-left font-medium">Floor</th>
                  <th className="px-6 py-3 text-left font-medium">Capacity</th>
                  <th className="px-6 py-3 text-left font-medium">Bookings</th>
                  <th className="px-6 py-3 text-left font-medium">Utilization</th>
                  <th className="px-6 py-3 text-left font-medium">Status</th>
                  <th className="px-6 py-3 text-left font-medium">Last Maintenance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    <TableRowSkeleton cols={8} />
                    <TableRowSkeleton cols={8} />
                    <TableRowSkeleton cols={8} />
                  </>
                ) : (
                  (roomData.roomDetails || []).slice(0, 15).map((room, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{room.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{room.type}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600">{room.floor || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800">{room.capacity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-800">{room.bookings}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`rounded-full h-2 ${
                                room.utilization > 80 ? 'bg-green-500' :
                                room.utilization > 60 ? 'bg-blue-500' :
                                room.utilization > 40 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(room.utilization, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-600 text-sm">{Math.min(room.utilization, 100)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          room.status === 'available' ? 'bg-green-100 text-green-700' :
                          room.status === 'occupied' ? 'bg-yellow-100 text-yellow-700' :
                          room.status === 'maintenance' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {room.status === 'available' ? 'Available' : 
                           room.status === 'occupied' ? 'Occupied' : 
                           room.status === 'maintenance' ? 'Maintenance' : room.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-600 text-xs">
                        {formatDateTime(room.lastMaintenance)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer note */}
          {roomData.roomDetails && roomData.roomDetails.length > 15 && (
            <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500 text-center">
              Showing 15 of {roomData.roomDetails.length} rooms
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default AnalyticsRooms;