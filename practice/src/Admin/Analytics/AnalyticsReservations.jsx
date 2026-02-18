// AnalyticsReservations.jsx

import { useState, useEffect, useCallback, useRef } from "react";
import {
  CalendarCheck,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Users,
  Calendar,
  X,
  MapPin,
  AlertCircle,
  Building
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsReservations({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [reservationData, setReservationData] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
    expired: 0,
    ongoing: 0,
    byRoom: [],
    byDayOfWeek: {
      mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
    },
    popularRooms: [],
    trends: {
      total: { value: 0, percentage: 0, direction: 'up' },
      pending: { value: 0, percentage: 0, direction: 'up' },
      approved: { value: 0, percentage: 0, direction: 'up' },
      completed: { value: 0, percentage: 0, direction: 'up' },
      cancelled: { value: 0, percentage: 0, direction: 'up' }
    },
    growth: {
      labels: [],
      values: []
    },
    floorDistribution: [],
    avgGroupSize: 0,
    totalParticipants: 0,
    previousTotal: 0,
    userDepartmentStats: [],
    topReservers: []
  });

  const calendarRef = useRef(null);

  const fetchReservationAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/analytics/reservations/detailed?range=${dateRange}`;
      
      // Add custom date parameters if custom range is selected
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/reservations/detailed?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      console.log("Fetching analytics from:", url);
      const response = await api.get(url);
      
      if (response.data && response.data.success) {
        setReservationData(response.data.data);
        console.log("Reservation analytics data loaded:", response.data.data);
      } else {
        console.error("API returned unsuccessful response:", response.data);
        // Fallback to simple endpoint if detailed fails
        await fetchSimpleAnalytics();
      }
    } catch (error) {
      console.error("Error fetching detailed analytics:", error);
      // Fallback to simple endpoint
      await fetchSimpleAnalytics();
    } finally {
      setLoading(false);
    }
  }, [dateRange, customStartDate, customEndDate]);

  const fetchSimpleAnalytics = async () => {
    try {
      let url = `/analytics/reservations?range=${dateRange}`;
      if (dateRange === "custom" && customStartDate && customEndDate) {
        url = `/analytics/reservations?startDate=${customStartDate}&endDate=${customEndDate}`;
      }
      
      const response = await api.get(url);
      if (response.data && response.data.success) {
        setReservationData(response.data.data);
        console.log("Simple analytics loaded:", response.data.data);
      }
    } catch (error) {
      console.error("Error fetching simple analytics:", error);
    }
  };

  useEffect(() => {
    fetchReservationAnalytics();
  }, [fetchReservationAnalytics]);

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

  const formatDateTime = (date) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
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

  const DayChartSkeleton = () => (
    <div className="grid grid-cols-7 gap-2 animate-pulse">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex flex-col items-center">
          <div className="w-full bg-gray-200 rounded-t mb-2" style={{ height: `${Math.random() * 100 + 50}px` }}></div>
          <div className="h-3 bg-gray-200 rounded w-8 mb-1"></div>
          <div className="h-3 bg-gray-200 rounded w-6"></div>
        </div>
      ))}
    </div>
  );

  const GrowthChartSkeleton = () => (
    <div className="h-64 flex items-end justify-between gap-2 animate-pulse">
      {Array(7).fill(0).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full bg-gray-200 rounded-t" style={{ height: `${Math.random() * 150 + 50}px` }}></div>
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

  // ==================== CSV EXPORT FUNCTION (without Unicode blocks) ====================

  const exportToCSV = () => {
    try {
      // Create CSV content with Excel-friendly formatting
      let csvContent = "";
      
      // Helper to add a row with proper Excel formatting
      const addRow = (cells) => {
        // Ensure cells are properly formatted for Excel
        const formattedCells = cells.map(cell => {
          if (cell === null || cell === undefined) return '';
          
          // Convert to string
          let stringCell = String(cell);
          
          // Handle long text by adding spaces for wrapping
          if (stringCell.length > 50) {
            // Add soft returns for better wrapping in Excel
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

      // Helper to add a blank row for spacing
      const addBlankRow = () => {
        csvContent += '\n';
      };

      // Helper to add a section header with Excel formatting
      const addSectionHeader = (title, subtitle = '') => {
        addRow(['========== ' + title.toUpperCase() + ' ==========']);
        if (subtitle) {
          addRow([subtitle]);
        }
        addBlankRow();
      };

      // Helper to add a subheader
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
      addRow(['RESERVATION ANALYTICS REPORT']);
      addRow(['========================================']);
      addBlankRow();
      addRow(['Generated:', new Date().toLocaleString()]);
      addRow(['Date Range:', rangeDescription]);
      addRow(['Report ID:', `RPT-${Date.now()}`]);
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 1: KEY METRICS ====================
      addSectionHeader('SECTION 1: KEY METRICS');
      
      // Metrics summary table
      addRow(['Metric', 'Current Value', 'Change %', 'Trend', 'Status']);
      addRow([
        'TOTAL RESERVATIONS', 
        (reservationData.total || 0).toLocaleString(),
        `${reservationData.trends?.total?.percentage || 0}%`,
        reservationData.trends?.total?.direction === 'up' ? 'Increasing' : 'Decreasing',
        reservationData.trends?.total?.percentage > 0 ? 'Positive' : 'Needs Attention'
      ]);
      addRow([
        'COMPLETED', 
        (reservationData.completed || 0).toLocaleString(),
        `${reservationData.trends?.completed?.percentage || 0}%`,
        reservationData.trends?.completed?.direction === 'up' ? 'Increasing' : 'Decreasing',
        'Success Rate: ' + Math.round((reservationData.completed / (reservationData.total || 1)) * 100) + '%'
      ]);
      addRow([
        'PENDING', 
        (reservationData.pending || 0).toLocaleString(),
        `${reservationData.trends?.pending?.percentage || 0}%`,
        reservationData.trends?.pending?.direction === 'up' ? 'Increasing' : 'Decreasing',
        'Awaiting Action'
      ]);
      addRow([
        'CANCELLED', 
        (reservationData.cancelled || 0).toLocaleString(),
        `${reservationData.trends?.cancelled?.percentage || 0}%`,
        reservationData.trends?.cancelled?.direction === 'up' ? 'Increasing' : 'Decreasing',
        'Cancellation Rate: ' + Math.round((reservationData.cancelled / (reservationData.total || 1)) * 100) + '%'
      ]);
      addBlankRow();

      // Additional metrics in a more readable format
      addSubHeader('Additional Metrics');
      addRow(['Metric', 'Value', 'Notes']);
      addRow(['Average Group Size', (reservationData.avgGroupSize || 0).toFixed(1), 'People per reservation']);
      addRow(['Total Participants', (reservationData.totalParticipants || 0).toLocaleString(), 'Combined attendees']);
      addRow(['Previous Period Total', (reservationData.previousTotal || 0).toLocaleString(), 'Comparison baseline']);
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 2: STATUS BREAKDOWN ====================
      addSectionHeader('SECTION 2: RESERVATION STATUS BREAKDOWN');
      
      const total = reservationData.total || 1;
      
      // Status breakdown table with percentages
      addRow(['Status', 'Count', 'Percentage of Total', 'Status Description']);
      
      const statuses = [
        { label: 'Pending', value: reservationData.pending || 0, description: 'Awaiting approval' },
        { label: 'Approved', value: reservationData.approved || 0, description: 'Approved but not started' },
        { label: 'Completed', value: reservationData.completed || 0, description: 'Successfully finished' },
        { label: 'Rejected', value: reservationData.rejected || 0, description: 'Not approved' },
        { label: 'Cancelled', value: reservationData.cancelled || 0, description: 'Cancelled by user' },
        { label: 'Expired', value: reservationData.expired || 0, description: 'Passed without action' },
        { label: 'Ongoing', value: reservationData.ongoing || 0, description: 'Currently in progress' }
      ];

      statuses.forEach(status => {
        const percentage = Math.round((status.value / total) * 100);
        
        addRow([
          status.label,
          status.value.toLocaleString(),
          percentage + '%',
          status.description
        ]);
      });
      addBlankRow();

      // Status distribution summary
      addSubHeader('Status Distribution Summary');
      addRow(['Category', 'Count', 'Percentage']);
      
      const activeTotal = reservationData.pending + reservationData.approved + reservationData.ongoing;
      const inactiveTotal = reservationData.completed + reservationData.cancelled + reservationData.rejected + reservationData.expired;
      
      addRow(['Active (Pending + Approved + Ongoing)', activeTotal.toLocaleString(), Math.round((activeTotal / total) * 100) + '%']);
      addRow(['Inactive (Completed + Cancelled + Rejected + Expired)', inactiveTotal.toLocaleString(), Math.round((inactiveTotal / total) * 100) + '%']);
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 3: DAY OF WEEK DISTRIBUTION ====================
      addSectionHeader('SECTION 3: DAY OF WEEK DISTRIBUTION');
      
      const totalDays = Object.values(reservationData.byDayOfWeek || {}).reduce((a, b) => a + b, 0) || 1;
      const dayNames = {
        mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', 
        thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday'
      };

      addRow(['Day', 'Reservations', 'Percentage', 'Peak Day Indicator']);
      
      // Find peak day
      const peakDay = Object.entries(reservationData.byDayOfWeek || {}).reduce((a, b) => 
        (b[1] > a[1] ? b : a), ['', 0]);
      
      Object.entries(reservationData.byDayOfWeek || {}).forEach(([day, count]) => {
        const percentage = Math.round((count / totalDays) * 100);
        const isPeakDay = day === peakDay[0] ? '★ Peak Day' : '';
        
        addRow([
          dayNames[day] || day,
          count.toLocaleString(),
          percentage + '%',
          isPeakDay
        ]);
      });

      if (peakDay[0]) {
        addBlankRow();
        addRow(['Peak Day:', dayNames[peakDay[0]] || peakDay[0], 'with', peakDay[1].toLocaleString(), 'reservations - Busiest day of the week']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 4: FLOOR DISTRIBUTION ====================
      addSectionHeader('SECTION 4: FLOOR DISTRIBUTION');
      
      if (reservationData.floorDistribution && reservationData.floorDistribution.length > 0) {
        addRow(['Floor', 'Reservations', 'Percentage', 'Ranking']);
        
        // Sort floors by reservation count descending
        const sortedFloors = [...reservationData.floorDistribution].sort((a, b) => b.value - a.value);
        
        sortedFloors.forEach((floor, idx) => {
          const percentage = Math.round((floor.value / total) * 100);
          const ranking = idx === 0 ? 'Most Active' : idx === sortedFloors.length - 1 ? 'Least Active' : `#${idx + 1} in activity`;
          
          addRow([
            floor.name || `Floor ${idx + 1}`,
            (floor.value || 0).toLocaleString(),
            percentage + '%',
            ranking
          ]);
        });
      } else {
        addRow(['No floor distribution data available for this period']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 5: DEPARTMENT STATISTICS ====================
      addSectionHeader('SECTION 5: DEPARTMENT RESERVATION STATISTICS');
      
      if (reservationData.userDepartmentStats && reservationData.userDepartmentStats.length > 0) {
        addRow(['Department', 'Reservations', 'Percentage', 'Activity Level', 'Top Reserver']);
        
        // Sort departments by reservation count
        const sortedDepts = [...reservationData.userDepartmentStats].sort((a, b) => b.count - a.count);
        
        // Create a map of top reserver by department
        const topReserverByDept = {};
        if (reservationData.topReservers) {
          reservationData.topReservers.forEach(user => {
            if (!topReserverByDept[user.department] || user.count > topReserverByDept[user.department].count) {
              topReserverByDept[user.department] = user;
            }
          });
        }
        
        sortedDepts.forEach((dept, idx) => {
          const percentage = Math.round((dept.count / total) * 100);
          
          // Determine activity level
          let activityLevel = 'Low';
          if (percentage > 30) activityLevel = 'High';
          else if (percentage > 15) activityLevel = 'Medium';
          else if (percentage > 5) activityLevel = 'Low-Medium';
          
          const topReserver = topReserverByDept[dept.name];
          
          addRow([
            dept.name || 'Unknown',
            (dept.count || 0).toLocaleString(),
            percentage + '%',
            activityLevel,
            topReserver ? topReserver.name + ' (' + topReserver.count + ' reservations)' : 'No data'
          ]);
        });
        
        addBlankRow();
        addRow(['Department Activity Summary:']);
        const highActive = sortedDepts.filter(d => (d.count / total) * 100 > 30).length;
        const mediumActive = sortedDepts.filter(d => {
          const pct = (d.count / total) * 100;
          return pct > 15 && pct <= 30;
        }).length;
        addRow(['- High Activity Departments (>30%):', highActive]);
        addRow(['- Medium Activity Departments (15-30%):', mediumActive]);
        addRow(['- Low Activity Departments (<15%):', sortedDepts.length - highActive - mediumActive]);
        
      } else {
        addRow(['No department statistics available for this period']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 6: TOP RESERVERS ====================
      addSectionHeader('SECTION 6: TOP RESERVERS DETAILS');
      
      if (reservationData.topReservers && reservationData.topReservers.length > 0) {
        addRow(['Rank', 'Name', 'Department', 'Reservations', 'Percentage', 'Contribution Level']);
        
        // Sort top reservers by count
        const sortedTopReservers = [...reservationData.topReservers].sort((a, b) => b.count - a.count);
        
        sortedTopReservers.slice(0, 15).forEach((user, index) => {
          const percentage = Math.round((user.count / total) * 100);
          
          // Contribution level
          let contribution = 'Contributor';
          if (percentage > 20) contribution = 'Top Contributor';
          else if (percentage > 10) contribution = 'Major Contributor';
          else if (percentage > 5) contribution = 'Significant Contributor';
          
          addRow([
            '#' + (index + 1),
            user.name || 'Unknown',
            user.department || 'N/A',
            (user.count || 0).toLocaleString(),
            percentage + '%',
            contribution
          ]);
        });
        
        addBlankRow();
        addRow(['Note: Top 15 reservers shown based on total reservation count']);
        
        // Summary statistics
        if (sortedTopReservers.length > 0) {
          const top3Total = sortedTopReservers.slice(0, 3).reduce((sum, u) => sum + u.count, 0);
          addRow(['Top 3 Reservers Combined:', top3Total.toLocaleString(), 'reservations', `(${Math.round((top3Total / total) * 100)}% of total)`]);
        }
      } else {
        addRow(['No top reserver data available for this period']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 7: POPULAR ROOMS ====================
      addSectionHeader('SECTION 7: ROOM UTILIZATION & POPULARITY');
      
      if (reservationData.popularRooms && reservationData.popularRooms.length > 0) {
        addRow(['Rank', 'Room Name', 'Total Bookings', 'Approved', 'Completed', 'Utilization Rate', 'Performance Rating']);
        
        // Sort by bookings
        const sortedRooms = [...reservationData.popularRooms].sort((a, b) => b.bookings - a.bookings);
        
        sortedRooms.forEach((room, index) => {
          // Performance rating based on utilization
          let performance = 'Low Usage';
          if (room.utilization > 80) performance = 'Excellent';
          else if (room.utilization > 60) performance = 'Good';
          else if (room.utilization > 40) performance = 'Average';
          else if (room.utilization > 20) performance = 'Below Average';
          
          addRow([
            '#' + (index + 1),
            room.name || 'Unknown',
            (room.bookings || 0).toLocaleString(),
            (room.approved || 0).toLocaleString(),
            (room.completed || 0).toLocaleString(),
            (room.utilization || 0) + '%',
            performance
          ]);
        });
        
        addBlankRow();
        
        // Room performance summary
        addSubHeader('Room Performance Summary');
        const excellentRooms = sortedRooms.filter(r => r.utilization > 80).length;
        const goodRooms = sortedRooms.filter(r => r.utilization > 60 && r.utilization <= 80).length;
        const avgRooms = sortedRooms.filter(r => r.utilization > 40 && r.utilization <= 60).length;
        const lowRooms = sortedRooms.filter(r => r.utilization <= 40).length;
        
        addRow(['Excellent (>80%):', excellentRooms]);
        addRow(['Good (60-80%):', goodRooms]);
        addRow(['Average (40-60%):', avgRooms]);
        addRow(['Low (≤40%):', lowRooms]);
        
      } else {
        addRow(['No popular rooms data available for this period']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 8: ROOM DETAILS ====================
      addSectionHeader('SECTION 8: COMPREHENSIVE ROOM DETAILS');
      
      if (reservationData.byRoom && reservationData.byRoom.length > 0) {
        addRow(['Room Name', 'Total', 'Approved', 'Pending', 'Completed', 'Cancelled', 'Success Rate', 'Performance Notes']);
        
        // Sort by total reservations
        const sortedRoomDetails = [...reservationData.byRoom].sort((a, b) => b.count - a.count);
        
        sortedRoomDetails.slice(0, 20).forEach((room) => {
          const total = room.count || 0;
          const completed = room.completed || 0;
          const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
          const pending = room.pending || 0;
          const approved = room.approved || 0;
          
          // Determine room performance note
          let note = 'Normal operation';
          if (successRate > 80) note = 'High performing room - excellent completion rate';
          else if (successRate < 40) note = 'Low completion rate - review required';
          else if (pending > approved && pending > 10) note = 'High pending count - attention needed for approvals';
          else if (room.cancelled > completed) note = 'High cancellation rate - investigate reasons';
          
          addRow([
            room.name || 'Unknown',
            total.toLocaleString(),
            approved.toLocaleString(),
            pending.toLocaleString(),
            completed.toLocaleString(),
            (room.cancelled || 0).toLocaleString(),
            successRate + '%',
            note
          ]);
        });
        
        addBlankRow();
        addRow(['Note: Showing top 20 rooms by total reservations']);
      } else {
        addRow(['No room details available for this period']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 9: GROWTH TRENDS ====================
      addSectionHeader('SECTION 9: RESERVATION GROWTH TRENDS');
      
      addRow(['Period Type:', dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : dateRange === 'year' ? 'Monthly' : 'Custom Period']);
      addBlankRow();
      
      if (reservationData.growth?.labels && reservationData.growth.labels.length > 0) {
        addRow(['Period', 'New Reservations', 'Change', 'Change %', 'Trend Direction']);
        
        const values = reservationData.growth.values || [];
        const labels = reservationData.growth.labels || [];
        
        labels.forEach((label, index) => {
          const value = values[index] || 0;
          const prevValue = index > 0 ? values[index - 1] : value;
          const change = value - prevValue;
          const changePercent = prevValue > 0 ? Math.round((change / prevValue) * 100) : 0;
          
          // Trend direction
          let trendDirection = 'Stable';
          if (change > 0) trendDirection = 'Growing ↑';
          else if (change < 0) trendDirection = 'Declining ↓';
          
          const changeDisplay = change > 0 ? '+' + change.toLocaleString() : change.toLocaleString();
          const changePercentDisplay = changePercent > 0 ? '+' + changePercent + '%' : changePercent + '%';
          
          addRow([
            label,
            value.toLocaleString(),
            changeDisplay,
            changePercentDisplay,
            trendDirection
          ]);
        });
        
        // Calculate overall growth
        if (values.length > 1) {
          const firstValue = values[0];
          const lastValue = values[values.length - 1];
          const totalGrowth = lastValue - firstValue;
          const growthPercent = firstValue > 0 ? Math.round((totalGrowth / firstValue) * 100) : 0;
          
          addBlankRow();
          addRow(['OVERALL GROWTH SUMMARY:']);
          addRow(['Period Start:', labels[0], values[0].toLocaleString(), 'reservations']);
          addRow(['Period End:', labels[labels.length - 1], lastValue.toLocaleString(), 'reservations']);
          addRow(['Total Change:', totalGrowth > 0 ? '+' + totalGrowth.toLocaleString() : totalGrowth.toLocaleString(), 'reservations']);
          addRow(['Growth Rate:', (growthPercent > 0 ? '+' : '') + growthPercent + '%']);
          addRow(['Overall Trend:', totalGrowth > 0 ? '📈 Positive Growth Trend' : '📉 Negative Decline Trend']);
        }
      } else {
        addRow(['No growth data available for this period']);
      }
      addBlankRow();
      addBlankRow();

      // ==================== SECTION 10: EXECUTIVE SUMMARY ====================
      addSectionHeader('SECTION 10: EXECUTIVE SUMMARY & KEY INSIGHTS');
      
      // Calculate key metrics for insights
      const completionRate = total > 0 ? Math.round((reservationData.completed / total) * 100) : 0;
      const approvalRate = total > 0 ? Math.round(((reservationData.approved + reservationData.completed) / total) * 100) : 0;
      const cancellationRate = total > 0 ? Math.round((reservationData.cancelled / total) * 100) : 0;
      const pendingRate = total > 0 ? Math.round((reservationData.pending / total) * 100) : 0;
      
      addRow(['Performance Metric', 'Current Value', 'Industry Benchmark', 'Status', 'Action Required']);
      addRow([
        'Completion Rate', 
        completionRate + '%', 
        '70%', 
        completionRate >= 70 ? 'Meets Benchmark' : 'Below Benchmark',
        completionRate >= 70 ? 'Maintain current practices' : 'Focus on improving completion rates'
      ]);
      addRow([
        'Approval Rate', 
        approvalRate + '%', 
        '80%', 
        approvalRate >= 80 ? 'Meets Benchmark' : 'Below Benchmark',
        approvalRate >= 80 ? 'Good approval efficiency' : 'Review approval process'
      ]);
      addRow([
        'Cancellation Rate', 
        cancellationRate + '%', 
        '10%', 
        cancellationRate <= 10 ? 'Meets Benchmark' : 'Above Benchmark',
        cancellationRate <= 10 ? 'Acceptable cancellation level' : 'Investigate cancellation reasons'
      ]);
      addRow([
        'Pending Rate', 
        pendingRate + '%', 
        '15%', 
        pendingRate <= 15 ? 'Meets Benchmark' : 'Above Benchmark',
        pendingRate <= 15 ? 'Normal pending queue' : 'Clear pending reservations'
      ]);
      addBlankRow();
      
      // Key insights section
      addSubHeader('Key Insights & Recommendations');
      
      // Peak day insight
      if (peakDay[0]) {
        addRow([
          '• Peak Day Analysis:',
          `${dayNames[peakDay[0]] || peakDay[0]} is the busiest day with ${peakDay[1]} reservations`,
          'Recommendation: Consider allocating additional resources on this day'
        ]);
      }
      
      // Slow day insight
      const slowDay = Object.entries(reservationData.byDayOfWeek || {}).reduce((a, b) => 
        (b[1] < a[1] ? b : a), ['', Infinity]);
      if (slowDay[0] && slowDay[1] < totalDays / 7) {
        addRow([
          '• Low Activity Day:',
          `${dayNames[slowDay[0]] || slowDay[0]} has only ${slowDay[1]} reservations`,
          'Recommendation: Consider promotions or maintenance on this day'
        ]);
      }
      
      // Top department insight
      if (reservationData.userDepartmentStats && reservationData.userDepartmentStats.length > 0) {
        const sortedDepts = [...reservationData.userDepartmentStats].sort((a, b) => b.count - a.count);
        const topDept = sortedDepts[0];
        const deptPercentage = Math.round((topDept.count / total) * 100);
        addRow([
          '• Top Department:',
          `${topDept.name} leads with ${topDept.count} reservations (${deptPercentage}% of total)`,
          'Recommendation: Engage with department for best practices'
        ]);
        
        // Low performing departments
        const lowDepts = sortedDepts.filter(d => (d.count / total) * 100 < 5);
        if (lowDepts.length > 0) {
          addRow([
            '• Low Activity Departments:',
            `${lowDepts.length} departments have <5% of total reservations`,
            'Recommendation: Reach out to understand barriers'
          ]);
        }
      }
      
      // Top room insight
      if (reservationData.popularRooms && reservationData.popularRooms.length > 0) {
        const sortedRooms = [...reservationData.popularRooms].sort((a, b) => b.bookings - a.bookings);
        const topRoom = sortedRooms[0];
        addRow([
          '• Most Popular Room:',
          `${topRoom.name} with ${topRoom.bookings} bookings and ${topRoom.utilization}% utilization`,
          'Recommendation: Ensure this room is well-maintained'
        ]);
        
        // Low utilization rooms
        const lowUtilRooms = sortedRooms.filter(r => r.utilization < 30);
        if (lowUtilRooms.length > 0) {
          addRow([
            '• Underutilized Rooms:',
            `${lowUtilRooms.length} rooms with <30% utilization`,
            'Recommendation: Consider marketing or repurposing these rooms'
          ]);
        }
      }
      
      // Top reserver insight
      if (reservationData.topReservers && reservationData.topReservers.length > 0) {
        const sortedTop = [...reservationData.topReservers].sort((a, b) => b.count - a.count);
        const topReserver = sortedTop[0];
        if (topReserver) {
          addRow([
            '• Top Reserver:',
            `${topReserver.name} from ${topReserver.department || 'N/A'} with ${topReserver.count} reservations`,
            'Recommendation: Recognize top users'
          ]);
        }
      }
      
      // Growth insight
      if (reservationData.trends?.total) {
        const trend = reservationData.trends.total;
        const growthStatus = trend.direction === 'up' ? 'positive' : 'negative';
        addRow([
          '• Overall Trend:',
          `${trend.direction === 'up' ? 'Growth' : 'Decline'} of ${trend.percentage}% compared to previous period`,
          `Recommendation: ${trend.direction === 'up' ? 'Continue current strategies' : 'Investigate causes of decline'}`
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
      link.setAttribute('download', `Reservation Analytics ${dateRange} ${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error("Error exporting to CSV:", error);
      alert("Failed to export data. Please try again.");
    }
  };

  // ==================== COMPONENTS ====================

  const StatCard = ({ title, value, icon: Icon, trend, color = "blue", isLoading = false }) => {
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
            </p>
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
          <div className="p-2">
            <Icon className={getColorClass(color)} size={20} />
          </div>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, total, color = "blue", showValue = true, isLoading = false }) => {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
    
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
      <div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 capitalize">{label}</span>
          {showValue && <span className="text-gray-800 font-medium">{value.toLocaleString()}</span>}
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${getBgColorClass(color)} rounded-full h-2 transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // ==================== RENDER ====================

  if (loading && !reservationData.total) {
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
            </div>
          </div>

          {/* Status Statistics Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
            <SectionHeaderSkeleton />
            <div className="flex flex-wrap gap-4">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
          </div>

          {/* Analytics Grid Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <SectionHeaderSkeleton />
                <div className="space-y-4">
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                  <ProgressBarSkeleton />
                </div>
              </div>
            ))}
          </div>

          {/* Day of Week Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <DayChartSkeleton />
          </div>

          {/* Growth Chart Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <GrowthChartSkeleton />
          </div>

          {/* Tables Skeleton */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <TableSkeleton rows={5} cols={5} />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
            <SectionHeaderSkeleton />
            <TableSkeleton rows={5} cols={4} />
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <SectionHeaderSkeleton />
            <TableSkeleton rows={5} cols={6} />
          </div>
        </div>
      </main>
    );
  }

  const totalReservations = reservationData.total || 0;
  const totalDays = Object.values(reservationData.byDayOfWeek || {}).reduce((a, b) => a + b, 0) || 1;

  return (
    <main className="ml-[250px] w-[calc(100%-250px)] min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-[#CC0000]">
              Reservation Analytics
            </h1>
            <p className="text-gray-600">
              {dateRange === 'week' ? 'Last 7 days' : 
               dateRange === 'month' ? 'Last 30 days' : 
               dateRange === 'year' ? 'Last 12 months' : 
               dateRange === 'custom' && customStartDate && customEndDate ? `${formatDate(customStartDate)} to ${formatDate(customEndDate)}` : 
               'Track booking patterns, trends, and room utilization'}
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
              onClick={fetchReservationAnalytics}
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
        {/* Reservation Statistics Cards */}
        <div className="flex flex-col gap-4 mb-6 w-full">
          {/* Key Metrics Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Key Metrics</h2>
            <div className="flex flex-wrap gap-4">
              <StatCard 
                title="Total Reservations" 
                value={reservationData.total} 
                icon={CalendarCheck} 
                trend={reservationData.trends?.total}
                color="blue" 
                isLoading={loading}
              />
              <StatCard 
                title="Completed" 
                value={reservationData.completed} 
                icon={CheckCircle} 
                trend={reservationData.trends?.completed}
                color="green" 
                isLoading={loading}
              />
              <StatCard 
                title="Pending" 
                value={reservationData.pending} 
                icon={Clock} 
                trend={reservationData.trends?.pending}
                color="yellow" 
                isLoading={loading}
              />
              <StatCard 
                title="Cancelled" 
                value={reservationData.cancelled} 
                icon={XCircle} 
                trend={reservationData.trends?.cancelled}
                color="red" 
                isLoading={loading}
              />
            </div>
          </div>

          {/* Status Statistics Section */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Reservation Status</h2>
            <div className="flex flex-wrap gap-4">
              <StatCard 
                title="Approved" 
                value={reservationData.approved} 
                icon={CheckCircle} 
                color="green" 
                isLoading={loading}
              />
              <StatCard 
                title="Rejected" 
                value={reservationData.rejected} 
                icon={XCircle} 
                color="red" 
                isLoading={loading}
              />
              <StatCard 
                title="Expired" 
                value={reservationData.expired} 
                icon={AlertCircle} 
                color="orange" 
                isLoading={loading}
              />
              <StatCard 
                title="Ongoing" 
                value={reservationData.ongoing} 
                icon={Clock} 
                color="purple" 
                isLoading={loading}
              />
              <StatCard 
                title="Avg Group Size" 
                value={reservationData.avgGroupSize || 0} 
                icon={Users} 
                color="blue" 
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Reservation Status Breakdown */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Status Breakdown</h2>
            {loading ? (
              <div className="space-y-4">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pending</span>
                  <span className="text-yellow-600 font-semibold">{(reservationData.pending || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Approved</span>
                  <span className="text-green-600 font-semibold">{(reservationData.approved || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rejected</span>
                  <span className="text-red-600 font-semibold">{(reservationData.rejected || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Completed</span>
                  <span className="text-blue-600 font-semibold">{(reservationData.completed || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Cancelled</span>
                  <span className="text-gray-600 font-semibold">{(reservationData.cancelled || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Expired</span>
                  <span className="text-orange-600 font-semibold">{(reservationData.expired || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ongoing</span>
                  <span className="text-purple-600 font-semibold">{(reservationData.ongoing || 0).toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {/* Department Reservation Statistics */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Reservations by Department</h2>
            {loading ? (
              <div className="space-y-4">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              reservationData.userDepartmentStats && reservationData.userDepartmentStats.length > 0 ? (
                <div className="space-y-4">
                  {reservationData.userDepartmentStats.slice(0, 5).map((dept, idx) => (
                    <ProgressBar 
                      key={idx}
                      label={dept.name || 'Unknown'} 
                      value={dept.count || 0} 
                      total={reservationData.total || 1} 
                      color={idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "purple" : "orange"}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No department data available</p>
              )
            )}
          </div>

          {/* Floor Distribution */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Floor Distribution</h2>
            {loading ? (
              <div className="space-y-4">
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
                <ProgressBarSkeleton />
              </div>
            ) : (
              reservationData.floorDistribution && reservationData.floorDistribution.length > 0 ? (
                <div className="space-y-4">
                  {reservationData.floorDistribution.slice(0, 5).map((floor, idx) => (
                    <ProgressBar 
                      key={idx}
                      label={floor.name || 'Unknown'} 
                      value={floor.value || 0} 
                      total={reservationData.total || 1} 
                      color={idx === 0 ? "blue" : idx === 1 ? "green" : idx === 2 ? "purple" : "orange"}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No floor distribution data available</p>
              )
            )}
          </div>
        </div>

        {/* Day of Week Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Reservations by Day of Week</h2>
          {loading ? (
            <DayChartSkeleton />
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {Object.entries(reservationData.byDayOfWeek || {}).map(([day, count], index) => {
                const dayNames = {
                  mon: 'Monday',
                  tue: 'Tuesday',
                  wed: 'Wednesday',
                  thu: 'Thursday',
                  fri: 'Friday',
                  sat: 'Saturday',
                  sun: 'Sunday'
                };
                const percentage = (count / totalDays) * 100;
                const height = Math.max(percentage, 4);
                
                return (
                  <div key={day} className="flex flex-col items-center">
                    <div className="w-full bg-gray-100 rounded-t relative group mb-2" style={{ height: `${height * 2}px` }}>
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                        {count} reservations
                      </div>
                      <div 
                        className="bg-[#CC0000] rounded-t w-full absolute bottom-0"
                        style={{ height: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600">{dayNames[day]?.substring(0, 3) || day}</span>
                    <span className="text-sm text-gray-800 font-medium">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Growth Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Reservation Growth - {dateRange === 'week' ? 'Daily' : dateRange === 'month' ? 'Weekly' : dateRange === 'year' ? 'Monthly' : 'Custom Period'}
          </h2>
          {loading ? (
            <GrowthChartSkeleton />
          ) : (
            <div className="h-64 flex items-end justify-between gap-2">
              {reservationData.growth?.values && reservationData.growth.values.length > 0 ? (
                reservationData.growth.values.map((value, index) => {
                  const max = Math.max(...reservationData.growth.values, 1);
                  const height = max > 0 ? (value / max) * 100 : 0;
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <div 
                        className="w-full bg-[#CC0000]/20 rounded-t relative group"
                        style={{ height: `${height}%`, minHeight: '4px' }}
                      >
                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                          {value} reservations
                        </div>
                      </div>
                      <span className="text-xs text-gray-600">{reservationData.growth.labels?.[index] || ''}</span>
                    </div>
                  );
                })
              ) : (
                <div className="w-full text-center text-gray-500 py-12">
                  No growth data available for this period
                </div>
              )}
            </div>
          )}
        </div>

        {/* Popular Rooms */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Most Popular Rooms</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">Total Bookings</th>
                  <th className="px-6 py-3 text-left font-medium">Approved</th>
                  <th className="px-6 py-3 text-left font-medium">Completed</th>
                  <th className="px-6 py-3 text-left font-medium">Utilization Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                    <TableRowSkeleton cols={5} />
                  </>
                ) : (
                  reservationData.popularRooms && reservationData.popularRooms.length > 0 ? (
                    reservationData.popularRooms.map((room, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{room.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800">{room.bookings}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-green-600">{room.approved || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-blue-600">{room.completed || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 rounded-full h-2" 
                                style={{ width: `${room.utilization}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-600 text-sm">{room.utilization}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No popular rooms data available
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Reservers by Department */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Top Reservers by Department</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Name</th>
                  <th className="px-6 py-3 text-left font-medium">Department</th>
                  <th className="px-6 py-3 text-left font-medium">Reservations</th>
                  <th className="px-6 py-3 text-left font-medium">Percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                    <TableRowSkeleton cols={4} />
                  </>
                ) : (
                  reservationData.topReservers && reservationData.topReservers.length > 0 ? (
                    reservationData.topReservers.map((user, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{user.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.department || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{user.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 rounded-full h-2" 
                                style={{ width: `${Math.round((user.count / totalReservations) * 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-gray-600 text-sm">{Math.round((user.count / totalReservations) * 100)}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                        No top reserver data available
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Room Table */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Room Details</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-700 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left font-medium">Room</th>
                  <th className="px-6 py-3 text-left font-medium">Total</th>
                  <th className="px-6 py-3 text-left font-medium">Approved</th>
                  <th className="px-6 py-3 text-left font-medium">Pending</th>
                  <th className="px-6 py-3 text-left font-medium">Completed</th>
                  <th className="px-6 py-3 text-left font-medium">Cancelled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <>
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                  </>
                ) : (
                  reservationData.byRoom && reservationData.byRoom.length > 0 ? (
                    reservationData.byRoom.slice(0, 10).map((room, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800 font-medium">{room.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-800">{room.count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-green-600">{room.approved || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-yellow-600">{room.pending || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-blue-600">{room.completed || 0}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-red-600">{room.cancelled || 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No room data available
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}

export default AnalyticsReservations;