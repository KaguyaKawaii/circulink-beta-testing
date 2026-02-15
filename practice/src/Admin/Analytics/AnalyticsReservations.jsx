import { useState, useEffect } from "react";
import {
  CalendarCheck,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  BarChart3,
  PieChart
} from "lucide-react";
import api from "../../utils/api";

function AnalyticsReservations({ setView, admin }) {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("month");
  const [reservationData, setReservationData] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    completed: 0,
    cancelled: 0,
    byRoom: [],
    byTimeOfDay: {
      morning: 0,
      afternoon: 0,
      evening: 0
    },
    byDayOfWeek: {
      mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0
    },
    popularRooms: []
  });

  useEffect(() => {
    fetchReservationAnalytics();
  }, [dateRange]);

  const fetchReservationAnalytics = async () => {
    setLoading(true);
    try {
      // Mock data
      setTimeout(() => {
        setReservationData(getMockReservationData(dateRange));
        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error fetching reservation analytics:", error);
      setLoading(false);
    }
  };

  const getMockReservationData = (range) => {
    const mult = range === "week" ? 1 : range === "month" ? 4 : 48;
    
    return {
      total: 3420 * mult,
      pending: 45 * mult,
      approved: 210 * mult,
      rejected: 28 * mult,
      completed: 3120 * mult,
      cancelled: 17 * mult,
      byRoom: [
        { name: "Room 101", count: 450 },
        { name: "Room 102", count: 380 },
        { name: "Room 103", count: 520 },
        { name: "Room 201", count: 290 },
        { name: "Room 202", count: 410 },
        { name: "Room 203", count: 230 }
      ],
      byTimeOfDay: {
        morning: 850,
        afternoon: 1450,
        evening: 1120
      },
      byDayOfWeek: {
        mon: 520,
        tue: 580,
        wed: 610,
        thu: 590,
        fri: 650,
        sat: 320,
        sun: 150
      },
      popularRooms: [
        { name: "Room 103", bookings: 520, utilization: 85 },
        { name: "Room 101", bookings: 450, utilization: 78 },
        { name: "Room 202", bookings: 410, utilization: 72 },
        { name: "Room 102", bookings: 380, utilization: 68 },
        { name: "Room 201", bookings: 290, utilization: 52 }
      ]
    };
  };

  const StatCard = ({ title, value, icon: Icon, color = "blue", subtext }) => (
    <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-400 mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value.toLocaleString()}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-3 bg-${color}-500/10 rounded-lg`}>
          <Icon size={24} className={`text-${color}-500`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
        <div className="p-8 flex items-center justify-center h-screen">
          <RefreshCw size={40} className="animate-spin text-red-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pl-[250px]">
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">Reservation Analytics</h1>
            <p className="text-gray-400">Track booking patterns, trends, and room utilization</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-[#1a1a1a] rounded-lg p-1 border border-gray-800">
              {["week", "month", "year"].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`px-4 py-2 text-sm rounded-md transition-all cursor-pointer ${
                    dateRange === range
                      ? "bg-red-600 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
            <button className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white">
              <Download size={18} />
            </button>
            <button 
              onClick={fetchReservationAnalytics}
              className="p-2 bg-[#1a1a1a] border border-gray-800 rounded-lg text-gray-400 hover:text-white"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Reservations" value={reservationData.total} icon={CalendarCheck} color="blue" />
          <StatCard title="Completed" value={reservationData.completed} icon={CheckCircle} color="green" />
          <StatCard title="Pending" value={reservationData.pending} icon={Clock} color="yellow" />
          <StatCard title="Cancelled" value={reservationData.cancelled} icon={XCircle} color="red" />
        </div>

        {/* Reservation Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Reservation Status Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">{reservationData.pending}</div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">{reservationData.approved}</div>
                <div className="text-xs text-gray-500">Approved</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">{reservationData.rejected}</div>
                <div className="text-xs text-gray-500">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-500">{reservationData.completed}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-500">{reservationData.cancelled}</div>
                <div className="text-xs text-gray-500">Cancelled</div>
              </div>
            </div>
          </div>

          <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
            <h2 className="text-lg font-semibold text-white mb-4">Peak Hours</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Morning (8AM-12PM)</span>
                <span className="text-white font-semibold">{reservationData.byTimeOfDay.morning}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Afternoon (12PM-5PM)</span>
                <span className="text-white font-semibold">{reservationData.byTimeOfDay.afternoon}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Evening (5PM-9PM)</span>
                <span className="text-white font-semibold">{reservationData.byTimeOfDay.evening}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Rooms */}
        <div className="bg-[#1a1a1a] rounded-xl p-6 border border-gray-800">
          <h2 className="text-lg font-semibold text-white mb-4">Most Popular Rooms</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Room</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Total Bookings</th>
                  <th className="text-left py-3 text-sm font-medium text-gray-400">Utilization Rate</th>
                </tr>
              </thead>
              <tbody>
                {reservationData.popularRooms.map((room, index) => (
                  <tr key={index} className="border-b border-gray-800/50">
                    <td className="py-3 text-white font-medium">{room.name}</td>
                    <td className="py-3 text-white">{room.bookings}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 rounded-full h-2" 
                            style={{ width: `${room.utilization}%` }}
                          ></div>
                        </div>
                        <span className="text-gray-400 text-sm">{room.utilization}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsReservations;